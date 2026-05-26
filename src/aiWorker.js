require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const sse = require('./sse');
const sm = require('./stateMachine');

const WORKSPACE_ROOT = path.join(__dirname, '../workspace');
const PROMPTS_DIR    = path.join(__dirname, 'prompts');

const activeControllers = {};

function stopStage(projectId) {
    if (activeControllers[projectId]) {
        activeControllers[projectId].abort();
        delete activeControllers[projectId];
    }
}

// Dynamic AI client — reads from DB config, falls back to .env
function getAIClient() {
    const config = db.getOfficeConfig();
    const baseURL = (config && config.ai_base_url) || process.env.NINER_ROUTER_URL || 'http://localhost:20128/v1';
    const apiKey = (config && config.ai_api_key) || process.env.NINER_ROUTER_KEY || 'no-key-needed';
    return new OpenAI({ baseURL, apiKey });
}

function getModel() {
    const config = db.getOfficeConfig();
    return (config && config.ai_model) || process.env.AI_MODEL || 'kr/claude-sonnet-4-5';
}

// Load prompt from file (fallback)
function loadPromptFile(filename) {
    const fp = path.join(PROMPTS_DIR, filename);
    if (!fs.existsSync(fp)) return null;
    return fs.readFileSync(fp, 'utf8');
}

// Get prompt for a stage — custom from DB first, then file fallback
function getStagePrompt(stageId) {
    const config = db.getOfficeConfig();
    if (config && config.stages) {
        const stage = config.stages.find(s => s.id === stageId);
        if (stage && stage.customPrompt) return stage.customPrompt;
        if (stage && stage.promptFile) {
            const p = loadPromptFile(stage.promptFile);
            if (p) return p;
        }
    }
    // Legacy fallback
    const LEGACY_MAP = { planning: 'pm.md', design: 'ux.md', frontend: 'frontend.md', backend: 'backend.md', qa: 'qa.md', deploy: 'final.md' };
    return loadPromptFile(LEGACY_MAP[stageId] || `${stageId}.md`);
}

// Get stage config from DB
function getStageConfig(stageId) {
    const config = db.getOfficeConfig();
    if (config && config.stages) {
        const stage = config.stages.find(s => s.id === stageId);
        if (stage) return stage;
    }
    return null;
}

const STAGE_CONFIG = {
    planning: {
        chatRole: 'architect',
        files: ['blueprint.md', 'prd.md'],
        buildUserPrompt: (task, prior) => {
            const priorStr = Object.keys(prior).length > 0 
                ? 'EXISTING PROJECT FILES TO ANALYZE:\n' + Object.entries(prior).map(([k, v]) => `---FILE:${k}---\n${v}`).join('\n\n')
                : '';
            return `Project request: "${task}"\n\n${priorStr}\n\nRun your full PM protocol and produce the PRD + blueprint now. Separate files with ---FILE:filename--- markers.`;
        }
    },
    design: {
        chatRole: 'designer',
        files: ['mockup.md', 'design-tokens.json', 'ux-spec.md'],
        buildUserPrompt: (task, prior) =>
            `Project: "${task}"\n\nPRD/Blueprint:\n${prior['blueprint.md'] || prior['prd.md'] || ''}\n\nRun your full UX protocol and produce the design spec now. Separate files with ---FILE:filename--- markers.`
    },
    frontend: {
        chatRole: 'dev1',
        files: [],
        buildUserPrompt: (task, prior) =>
            `Project: "${task}"\n\nPRD:\n${prior['blueprint.md'] || prior['prd.md'] || ''}\n\nUX Spec:\n${prior['ux-spec.md'] || prior['mockup.md'] || ''}\n\nDesign Tokens:\n${prior['design-tokens.json'] || ''}\n\nQA Feedback:\n${prior['test-report.md'] || 'None'}\n\nRun your full Frontend Engineer protocol. You MUST build a proper folder structure. Use ---COMMAND:npx create-...--- to initialize the project or install libraries. Use ---FILE:path/to/file.ext--- to write code.`
    },
    backend: {
        chatRole: 'dev2',
        files: [],
        buildUserPrompt: (task, prior) =>
            `Project: "${task}"\n\nPRD:\n${prior['blueprint.md'] || prior['prd.md'] || ''}\n\nQA Feedback:\n${prior['test-report.md'] || 'None'}\n\nRun your full Backend Engineer protocol. You MUST build a proper folder structure. Use ---COMMAND:npm install ...--- to setup the environment. Use ---FILE:path/to/file.ext--- to write code.`
    },
    qa: {
        chatRole: 'qa',
        files: ['test-report.md', 'qa-strategy.md'],
        buildUserPrompt: (task, prior) => {
            const codeFiles = ['index.html','style.css','app.js']
                .map(f => prior[f] ? `\n### ${f}\n\`\`\`\n${prior[f].slice(0,3000)}\n\`\`\`` : '')
                .join('\n');
            return `Project: "${task}"\n\nCode to review:${codeFiles}\n\nRun your full QA protocol. End test-report.md with exactly "VERDICT: PASS" or "VERDICT: FAIL". Separate files with ---FILE:filename--- markers.`;
        }
    },
    deploy: {
        chatRole: 'devops',
        files: ['Dockerfile', 'docker-compose.yml', 'deployment-plan.md'],
        buildUserPrompt: (task, prior) =>
            `Project: "${task}"\n\nArchitecture:\n${prior['blueprint.md'] || ''}\n\nRun your full VP Engineering / final synthesis protocol and produce the deployment blueprint. Separate files with ---FILE:filename--- markers.`
    }
};

function loadPriorFiles(projectId) {
    const dir = path.join(WORKSPACE_ROOT, projectId);
    const result = {};
    if (!fs.existsSync(dir)) return result;

    let totalChars = 0;
    const MAX_CHARS = 40000; // ~10k tokens limit

    function readDirRec(currDir, baseDir = '') {
        try {
            const items = fs.readdirSync(currDir);
            for (const item of items) {
                if (['node_modules', '.git', 'dist', 'build', '.next', '.DS_Store', 'coverage'].includes(item)) continue;
                
                const fullPath = path.join(currDir, item);
                const relPath = path.join(baseDir, item);
                
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    readDirRec(fullPath, relPath);
                } else {
                    const ext = path.extname(item).toLowerCase();
                    const binaryExts = ['.png','.jpg','.jpeg','.gif','.ico','.pdf','.zip','.tar','.gz','.mp4','.mp3','.wav','.mov','.ttf','.woff','.woff2','.eot'];
                    if (binaryExts.includes(ext)) continue;
                    
                    if (totalChars > MAX_CHARS) continue;
                    
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.indexOf('\0') !== -1) continue; // binary check
                    
                    const toAdd = content.slice(0, 6000); // limit per file
                    result[relPath] = toAdd;
                    totalChars += toAdd.length;
                }
            }
        } catch (e) {
            console.error('Error reading dir', e);
        }
    }
    
    readDirRec(dir);
    return result;
}

function stripOuterCodeFence(content = '') {
    const trimmed = content.trim();
    const match = trimmed.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n?```$/);
    return match ? match[1].trim() : trimmed;
}

function sanitizeParsedFileContent(fname, content = '') {
    const normalized = stripOuterCodeFence(content);
    const ext = path.extname(fname).toLowerCase();
    if (ext === '.md' || ext === '.markdown' || ext === '.mdx') return normalized;

    return normalized
        .split('\n')
        .filter((line) => !/^```[a-zA-Z0-9_-]*\s*$/.test(line.trim()))
        .join('\n')
        .trimEnd();
}

function parseAIOutput(content, expectedFilenames = []) {
    const result = { files: {}, commands: [] };
    
    // 1. Parse Commands
    const cmdRegex = /---COMMAND:([^-\n]+)---/g;
    let cmdMatch;
    while ((cmdMatch = cmdRegex.exec(content)) !== null) {
        result.commands.push(cmdMatch[1].trim());
    }

    // 2. Parse Files
    // Split by ---FILE:path/to/file.ext---
    const parts = content.split(/---FILE:([^-\n]+)---/);
    if (parts.length > 1) {
        for (let i = 1; i < parts.length; i += 2) {
            const fname = parts[i].trim();
            const fcontent = stripOuterCodeFence(parts[i + 1] || '');
            // Accept any file with an extension, or if it's explicitly in expectedFilenames
            if (expectedFilenames.includes(fname) || fname.includes('.')) {
                result.files[fname] = sanitizeParsedFileContent(fname, fcontent);
            }
        }
    }

    // Fallback for markdown blocks if no files found
    if (Object.keys(result.files).length === 0) {
        const regex = /(?:`|\*\*|### )?([a-zA-Z0-9_./-]+)(?:`|\*\*|)?\s*```[a-z]*\n([\s\S]*?)```/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const fname = match[1].trim();
            const fcontent = stripOuterCodeFence(match[2] || '');
            if (expectedFilenames.includes(fname) || fname.includes('.')) {
                result.files[fname] = sanitizeParsedFileContent(fname, fcontent);
            }
        }
    }

    if (Object.keys(result.files).length === 0 && expectedFilenames.length === 1) {
        const fallbackName = expectedFilenames[0];
        result.files[fallbackName] = sanitizeParsedFileContent(fallbackName, content);
    }
    
    return result;
}

function getStageExecutionConfig(projectId, stageId) {
    const dbStage = getStageConfig(stageId); // Gets from DB/project config
    
    // Fallback/Legacy configuration
    const legacyConfig = STAGE_CONFIG[stageId];
    
    return {
        chatRole: (dbStage && dbStage.chatRole) || (legacyConfig && legacyConfig.chatRole) || 'assistant',
        files: (dbStage && dbStage.outputFiles) || (legacyConfig && legacyConfig.files) || [],
        buildUserPrompt: (legacyConfig && legacyConfig.buildUserPrompt) || ((task, prior) => {
            const priorStr = Object.keys(prior).length > 0 
                ? 'DOKUMEN DAN FILE YANG SUDAH DIHASILKAN SEBELUMNYA:\n' + Object.entries(prior).map(([k, v]) => `---FILE:${k}---\n${v}`).join('\n\n')
                : '';
            return `Tugas proyek: "${task}"\n\n${priorStr}\n\nLakukan tugas Anda sekarang. Tulis file output yang Anda hasilkan dengan menggunakan pemisah ---FILE:nama_file---.`;
        })
    };
}

function duckduckgoSearch(query) {
    const https = require('https');
    return new Promise((resolve) => {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }, (response) => {
            let body = '';
            response.on('data', (chunk) => { body += chunk; });
            response.on('end', () => {
                const results = [];
                const blocks = body.split('<div class="result');
                for (let i = 1; i < blocks.length && results.length < 5; i++) {
                    const block = blocks[i];
                    const linkMatch = block.match(/<a class="result__url"[^>]*href="([^"]+)"/i) || block.match(/<a class="result__a"[^>]*href="([^"]+)"/i);
                    const titleMatch = block.match(/<a class="result__a"[^>]*>([\s\S]*?)<\/a>/i);
                    const snippetMatch = block.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
                    
                    if (linkMatch && titleMatch) {
                        let link = linkMatch[1];
                        if (link.includes('uddg=')) {
                            try {
                                const u = new URL('https:' + link);
                                const realUrl = u.searchParams.get('uddg');
                                if (realUrl) link = realUrl;
                            } catch (e) {}
                        } else if (link.startsWith('//')) {
                            link = 'https:' + link;
                        }
                        const title = titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                        const snippet = snippetMatch 
                            ? snippetMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
                            : title;
                        results.push({ link, snippet: `${title} - ${snippet}` });
                    }
                }
                
                if (results.length === 0) {
                    resolve("Tidak ditemukan hasil pencarian di internet.");
                } else {
                    const summary = results.map((r, i) => `[${i+1}] Link: ${r.link}\nKutipan: ${r.snippet}`).join('\n\n');
                    resolve(summary);
                }
            });
        });
        req.on('error', (err) => {
            resolve(`Error saat mencari di DuckDuckGo: ${err.message}`);
        });
    });
}

function webScrape(url) {
    const https = require('https');
    const http = require('http');
    return new Promise((resolve) => {
        let targetUrl = url;
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
        }
        let parsedUrl;
        try {
            parsedUrl = new URL(targetUrl);
        } catch (e) {
            return resolve('Error: URL tidak valid.');
        }

        const client = parsedUrl.protocol === 'https:' ? https : http;
        const req = client.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }, (response) => {
            let body = '';
            response.on('data', (chunk) => { body += chunk; });
            response.on('end', () => {
                let text = body
                    .replace(/<script[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                if (text.length > 20000) {
                    text = text.substring(0, 20000) + '... [TRUNCATED]';
                }
                resolve(text);
            });
        });
        req.on('error', (err) => {
            resolve(`Error saat mengunjungi URL: ${err.message}`);
        });
    });
}

async function executeAgent(projectId, stage) {
    const execConfig = getStageExecutionConfig(projectId, stage);
    
    // Get dynamic config from DB
    const dbStage = getStageConfig(stage);
    const chatRole = execConfig.chatRole;
    const outputFiles = execConfig.files;
    const roleName = (dbStage && dbStage.role) || stage;

    const project = db.getProject(projectId);
    const basePrompt = getStagePrompt(stage);
    
    const searchInstruction = `
\n\n=== AKSES INTERNET & REFERENSI ===
Jika Anda memerlukan informasi tambahan, data terbaru, atau referensi akademis/teknis dari internet saat menyusun dokumen/file, Anda dapat mencari di internet atau mengunjungi halaman web dengan menuliskan perintah berikut di akhir respon Anda:
- Untuk mencari di internet: ---WEBSEARCH:kueri pencarian Anda---
- Untuk membaca konten URL website: ---WEBSCRAPE:url-tujuan---

Contoh Penggunaan:
---WEBSEARCH:metode penelitian kualitatif skripsi pdf---

Ketika Anda menuliskan tag perintah ini, sistem akan mengambil hasil pencarian/konten web secara otomatis, lalu mengirimkannya kembali kepada Anda sebagai giliran chat berikutnya (user role). Setelah Anda menerima hasilnya, Anda dapat menulis dan menyusun berkas/output final yang diminta.
Catatan: Pastikan menuliskan tag perintah ini secara persis pada teks respon Anda jika membutuhkan referensi internet. Jangan menuliskan output file final sebelum Anda mendapatkan hasil pencarian jika Anda memang membutuhkan data tersebut.`;

    const systemPrompt = (basePrompt || '') + '\n\nCRITICAL RULE: You MUST speak and write all your responses entirely in Bahasa Indonesia (Indonesian language), including your chat dialogues, summaries, and technical documents.' + searchInstruction;
    
    const wsDir = path.join(WORKSPACE_ROOT, projectId);
    if (!fs.existsSync(wsDir)) fs.mkdirSync(wsDir, { recursive: true });

    const priorFiles = loadPriorFiles(projectId);
    const userPrompt = execConfig.buildUserPrompt(project.task, priorFiles);

    const stageLabel = (dbStage && dbStage.name) || stage;
    const cid = db.insertChat(projectId, 'system', `⚙ Tahap: ${stageLabel} (${roleName}) — Agen AI sedang bekerja...`, stage);
    sse.emit(projectId, 'chat_message', { id: cid, ts: Date.now(), role: 'system', message: `⚙ Tahap: ${stageLabel} (${roleName}) — Agen AI sedang bekerja...`, stage });

    let fullContent = '';
    activeControllers[projectId] = new AbortController();

    let messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt }
    ];

    try {
        let turns = 0;
        const maxTurns = 3;

        while (turns < maxTurns) {
            fullContent = '';
            const openai = getAIClient();
            const stream = await openai.chat.completions.create({
                model: getModel(),
                max_tokens: 8192,
                stream: true,
                messages: messages
            }, { signal: activeControllers[projectId].signal });

            for await (const chunk of stream) {
                const text = chunk.choices?.[0]?.delta?.content || '';
                if (!text) continue;
                fullContent += text;
                sse.emit(projectId, 'ai_chunk', { chunk: text, stage });
            }

            const searchMatch = fullContent.match(/---WEBSEARCH:([\s\S]*?)---/);
            const scrapeMatch = fullContent.match(/---WEBSCRAPE:([\s\S]*?)---/);

            if (searchMatch) {
                const query = searchMatch[1].trim();
                const logMsg = `🌐 Agen AI mencari referensi internet: "${query}"...`;
                const cidLog = db.insertChat(projectId, 'system', logMsg, stage);
                sse.emit(projectId, 'chat_message', { id: cidLog, ts: Date.now(), role: 'system', message: logMsg, stage });

                const searchResult = await duckduckgoSearch(query);
                
                messages.push({ role: 'assistant', content: fullContent });
                messages.push({ role: 'user', content: `[HASIL PENCARIAN DUCKDUKGO UNTUK "${query}"]:\n${searchResult}\n\nSilakan lanjutkan pengerjaan tugas Anda dengan memanfaatkan referensi tersebut.` });
                
                // Clear current stream chunk on client
                const pipelineState = db.getPipelineState(projectId);
                if (pipelineState) {
                    sse.emit(projectId, 'pipeline_update', { 
                        fsmState: pipelineState.fsm_state, 
                        stage, 
                        kanban: pipelineState.kanban, 
                        pipeline: sm.buildPipelineSteps(pipelineState.fsm_state, db.getProjectStages(projectId)) 
                    });
                }


                turns++;
                continue;
            }

            if (scrapeMatch) {
                const url = scrapeMatch[1].trim();
                const logMsg = `🌐 Agen AI membaca halaman web: "${url}"...`;
                const cidLog = db.insertChat(projectId, 'system', logMsg, stage);
                sse.emit(projectId, 'chat_message', { id: cidLog, ts: Date.now(), role: 'system', message: logMsg, stage });

                const scrapeResult = await webScrape(url);
                
                messages.push({ role: 'assistant', content: fullContent });
                messages.push({ role: 'user', content: `[KONTEN HALAMAN WEB DARI "${url}"]:\n${scrapeResult}\n\nSilakan lanjutkan pengerjaan tugas Anda dengan memanfaatkan informasi tersebut.` });

                // Clear current stream chunk on client
                const pipelineState = db.getPipelineState(projectId);
                if (pipelineState) {
                    sse.emit(projectId, 'pipeline_update', { 
                        fsmState: pipelineState.fsm_state, 
                        stage, 
                        kanban: pipelineState.kanban, 
                        pipeline: sm.buildPipelineSteps(pipelineState.fsm_state, db.getProjectStages(projectId)) 
                    });
                }


                turns++;
                continue;
            }

            // No tools called, complete stage
            break;
        }

        // Validate syntax for frontend/backend (Sandbox)
        if (stage === 'frontend' || stage === 'backend') {
             if (fullContent.includes('syntax error') || fullContent.includes('SyntaxError')) {
                 const errId = db.insertChat(projectId, 'system', `⚠️ Syntax Check Warning on ${stage}`, stage);
                 sse.emit(projectId, 'chat_message', { id: errId, ts: Date.now(), role: 'system', message: `⚠️ Syntax Check Warning on ${stage}`, stage });
             }
        }

        const parsedData = parseAIOutput(fullContent, outputFiles);
        
        // 1. Write Files
        const officeConverter = require('./utils/officeConverter');
        for (const [fname, fcontent] of Object.entries(parsedData.files)) {
            const fpath = path.join(wsDir, fname);
            fs.mkdirSync(path.dirname(fpath), { recursive: true });
            
            const lowerFname = fname.toLowerCase();
            if (lowerFname.endsWith('.docx')) {
                const docxBuffer = await officeConverter.markdownToDocx(fcontent);
                fs.writeFileSync(fpath, docxBuffer);
            } else if (lowerFname.endsWith('.pptx')) {
                const pptxBuffer = await officeConverter.markdownToPptx(fcontent);
                fs.writeFileSync(fpath, pptxBuffer);
            } else if (lowerFname.endsWith('.xlsx')) {
                const xlsxBuffer = await officeConverter.tableToXlsx(fcontent);
                fs.writeFileSync(fpath, xlsxBuffer);
            } else {
                fs.writeFileSync(fpath, fcontent);
            }
            db.addFile(projectId, fname);
        }
        
        // 2. Execute Commands
        if (parsedData.commands.length > 0) {
            const cp = require('child_process');
            for (const cmd of parsedData.commands) {
                const cId = db.insertChat(projectId, 'system', `> Menjalankan perintah: ${cmd}`, stage);
                sse.emit(projectId, 'chat_message', { id: cId, ts: Date.now(), role: 'system', message: `> Menjalankan perintah: ${cmd}`, stage });
                
                try {
                    const out = cp.execSync(cmd, { cwd: wsDir, encoding: 'utf8', stdio: 'pipe', timeout: 30000 });
                    const summaryOut = (out || '').slice(0, 300).trim();
                    const sId = db.insertChat(projectId, 'system', `✅ Berhasil: ${cmd}\n${summaryOut ? 'Output: ' + summaryOut + '...' : ''}`, stage);
                    sse.emit(projectId, 'chat_message', { id: sId, ts: Date.now(), role: 'system', message: `✅ Berhasil: ${cmd}\n${summaryOut ? 'Output: ' + summaryOut + '...' : ''}`, stage });
                } catch (err) {
                    const eId = db.insertChat(projectId, 'system', `⚠️ Error pada perintah '${cmd}':\n${err.message}`, stage);
                    sse.emit(projectId, 'chat_message', { id: eId, ts: Date.now(), role: 'system', message: `⚠️ Error pada perintah '${cmd}':\n${err.message}`, stage });
                }
            }
        }

        // Fallback if AI produced absolutely nothing (no files and no commands)
        if (Object.keys(parsedData.files).length === 0 && parsedData.commands.length === 0) {
            const fallback = `${stage}-output.md`;
            fs.writeFileSync(path.join(wsDir, fallback), fullContent);
            db.addFile(projectId, fallback);
        }

        const state = db.getPipelineState(projectId);
        if (state) {
            sse.emit(projectId, 'workspace_update', { files: state.files });
        }

        const summary = fullContent.slice(0, 250).replace(/\n/g, ' ') + '...';
        const cid = db.insertChat(projectId, chatRole, summary, stage);
        sse.emit(projectId, 'chat_message', { id: cid, ts: Date.now(), role: chatRole, message: summary, stage });

        return fullContent;
    } catch (err) {
        if (err.name === 'AbortError') {
            const abId = db.insertChat(projectId, 'system', `🛑 Proses pada tahap ${stage} dihentikan secara paksa (Aborted).`, stage);
            sse.emit(projectId, 'chat_message', { id: abId, ts: Date.now(), role: 'system', message: `🛑 Proses pada tahap ${stage} dihentikan secara paksa.`, stage });
            throw err;
        }
        const eid = db.insertChat(projectId, 'system', `Error pada tahap ${stage}: ${err.message}`, stage);
        sse.emit(projectId, 'chat_message', { id: eid, ts: Date.now(), role: 'system', message: `Error pada tahap ${stage}: ${err.message}`, stage });
        throw err;
    } finally {
        delete activeControllers[projectId];
    }
}

async function runStage(projectId, stage) {
    if (stage === 'dev') {
        const chatId = db.insertChat(projectId, 'system', `🚀 Tahap Dev — Frontend & Backend berjalan paralel...`, 'dev');
        sse.emit(projectId, 'chat_message', { id: chatId, ts: Date.now(), role: 'system', message: `🚀 Tahap Dev — Frontend & Backend berjalan paralel...`, stage: 'dev' });
        
        await Promise.all([
            executeAgent(projectId, 'frontend').catch(e => console.error(e)),
            executeAgent(projectId, 'backend').catch(e => console.error(e))
        ]);

        const pipelineState = db.getPipelineState(projectId);
        if (!pipelineState) return;

        const newState = sm.transition('dev_active', 'ai_done');
        db.updateFsmState(projectId, newState);
        sse.emit(projectId, 'pipeline_update', { fsmState: newState, stage: sm.stageOf(newState), kanban: pipelineState.kanban, pipeline: sm.buildPipelineSteps(newState) });
        setTimeout(() => runStage(projectId, 'qa'), 500);
        return;
    }

    try {
        const fullContent = await executeAgent(projectId, stage);
        const stages = db.getProjectStages(projectId);

        // QA verdict
        if (stage === 'qa') {
            const verdict = fullContent.includes('VERDICT: PASS') ? 'pass' : 'fail';
            const verdictMsg = verdict === 'pass' ? 'QA PASSED ✓ — Melanjutkan ke tahap Deployment' : 'QA FAILED ✗ — Mengembalikan ke tahap Dev';
            const vid = db.insertChat(projectId, 'qa', verdictMsg, stage);
            sse.emit(projectId, 'chat_message', { id: vid, ts: Date.now(), role: 'qa', message: verdictMsg, stage });

            const pipelineState = db.getPipelineState(projectId);
            if (!pipelineState) return;

            const newState = sm.transition('qa_active', verdict, stages);
            db.updateFsmState(projectId, newState);
            sse.emit(projectId, 'pipeline_update', { fsmState: newState, stage: sm.stageOf(newState, stages), kanban: pipelineState.kanban, pipeline: sm.buildPipelineSteps(newState, stages) });
            setTimeout(() => runStage(projectId, newState === 'dev_active' ? 'dev' : 'deploy'), 1000);
            return;
        }

        // FSM transition
        const pipelineState = db.getPipelineState(projectId);
        if (!pipelineState) return;

        const currentState = pipelineState.fsm_state;
        const newState = sm.transition(currentState, 'ai_done', stages);
        db.updateFsmState(projectId, newState);
        sse.emit(projectId, 'pipeline_update', { fsmState: newState, stage: sm.stageOf(newState, stages), kanban: pipelineState.kanban, pipeline: sm.buildPipelineSteps(newState, stages) });

        if (sm.isCustomState(newState)) {
            const info = sm.parseCustomState(newState);
            if (info && info.status === 'active') {
                setTimeout(() => runStage(projectId, stages[info.index].id), 500);
            } else if (info && info.status === 'pm_review') {
                const rid = db.insertChat(projectId, 'system', `Menunggu persetujuan PM untuk melanjutkan...`, stage);
                sse.emit(projectId, 'chat_message', { id: rid, ts: Date.now(), role: 'system', message: `Menunggu persetujuan PM untuk melanjutkan...`, stage });
                sse.emit(projectId, 'decision_required', { role: 'pm', fsmState: newState, prompt: `Tahap '${stages[info.index].name}' selesai. Apakah Anda menyetujui hasilnya untuk lanjut ke tahap berikutnya?` });
            }
        } else {
            if (newState === 'qa_active') setTimeout(() => runStage(projectId, 'qa'), 500);
            else if (newState === 'deploy_active') setTimeout(() => runStage(projectId, 'deploy'), 500);
            else if (newState === 'design_active') setTimeout(() => runStage(projectId, 'design'), 500);
            else if (newState === 'dev_active') setTimeout(() => runStage(projectId, 'dev'), 500);
            // Wait for PM Review
            else if (newState.includes('pm_review')) {
                const rid = db.insertChat(projectId, 'system', `Menunggu persetujuan PM untuk melanjutkan...`, stage);
                sse.emit(projectId, 'chat_message', { id: rid, ts: Date.now(), role: 'system', message: `Menunggu persetujuan PM untuk melanjutkan...`, stage });
            }
        }

    } catch (err) {
        console.error('runStage error:', err);
    }
}

module.exports = { runStage, stopStage };

