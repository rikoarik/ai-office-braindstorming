const express = require('express');
const router = express.Router();
const { nanoid } = require('nanoid');
const OpenAI = require('openai');
const db = require('../db');
const sse = require('../sse');
const sm = require('../stateMachine');
const aiWorker = require('../aiWorker');
const fs = require('fs');
const path = require('path');

function copyProjectFiles(src, dest, projectId, baseDir = '') {
    if (!fs.existsSync(src)) return;
    const items = fs.readdirSync(src);
    const ignores = ['node_modules', '.git', '.next', 'dist', 'build', '.DS_Store', '.env', 'coverage'];
    for (const item of items) {
        if (ignores.includes(item)) continue;
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        const relPath = path.join(baseDir, item);
        
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
            if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
            copyProjectFiles(srcPath, destPath, projectId, relPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
            db.addFile(projectId, relPath);
        }
    }
}

const WORKSPACE_ROOT = path.join(__dirname, '../../workspace');

// Dynamic AI client — reads from DB config
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

const ONBOARD_SYSTEM = `You are the AI Factory Committee, a group of highly skilled AI experts: Alice (Project Manager), Bob (Software Architect), Eve (UI/UX Designer), Charlie (Frontend Developer), Dave (Backend Developer), Sam (QA), and Ivy (DevOps).
Your job is to onboard a new project by having a lively brainstorming session with the User in the Pre-Production Lobby.
When the user pitches an idea, DO NOT just have one person reply. Simulate a natural, multi-character discussion where at least 2 or 3 relevant team members jump in to give suggestions, ask clarifying questions, and debate tech stacks or design choices.
PREFIX every dialogue line with the character's name in bold, e.g., "**Alice (PM):** Ide yang bagus! Siapa target penggunanya?"
CRITICAL RULE: You MUST speak entirely in Bahasa Indonesia (Indonesian language).
If the user mentions an existing local project or a local path (e.g. /Users/...), DO NOT tell them that you cannot access it or ask them to upload files/zip. INSTEAD, just ask them what they want to do with the project (e.g. "Apa yang ingin kami bantu untuk proyek lokal ini? Refactor? Cari bug?"). Once they answer, output the <REQUIREMENTS> block. Tell them that after you output the requirements, a special input box will appear on their screen where they can paste their local path so the system can import it automatically!
Be conversational, concise, and encourage the user to provide feedback.
Once the user agrees on the final scope, Alice (PM) must output a JSON block wrapped in <REQUIREMENTS>...</REQUIREMENTS> tags containing:
{
  "name": "project name",
  "task": "full detailed task description for the AI factory",
  "techStack": ["..."],
  "targetUsers": "...",
  "features": ["feature1", "feature2", ...],
  "constraints": "..."
}
CRITICAL: If the user provides new information or requests changes AFTER you have already output the requirements, you MUST output the fully updated <REQUIREMENTS>...</REQUIREMENTS> JSON block again in your response so the system can refresh the data.`;

const INITIAL_KANBAN = [
    { id: 1, title: 'Gather Requirements',   status: 'todo' },
    { id: 2, title: 'Architecture Blueprint', status: 'todo' },
    { id: 3, title: 'UI Mockup',              status: 'todo' },
    { id: 4, title: 'Frontend Development',   status: 'todo' },
    { id: 5, title: 'Backend Development',    status: 'todo' },
    { id: 6, title: 'QA & Testing',           status: 'todo' },
    { id: 7, title: 'Deployment',             status: 'todo' }
];

const https = require('https');
const http = require('http');

// GET /api/projects/scrape — scrape web URL content
router.get('/scrape', (req, res) => {
    let { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url is required' });

    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    client.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    }, (response) => {
        let body = '';
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => {
            // Strip tags and script/style content
            let text = body
                .replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/<style[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            if (text.length > 50000) {
                text = text.substring(0, 50000) + '... [TRUNCATED]';
            }
            res.json({ text });
        });
    }).on('error', (err) => {
        res.status(500).json({ error: err.message });
    });
});

// POST /api/onboard — streaming chat with AI PM (SSE)
router.post('/onboard', async (req, res) => {
    const { messages } = req.body; // array of {role, content}
    if (!messages || !messages.length) return res.status(400).json({ error: 'messages required' });

    res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
        'X-Accel-Buffering': 'no'
    });
    res.write(':ok\n\n');

    let fullReply = '';
    try {
        // Use custom onboard prompt from DB if available
        const config = db.getOfficeConfig();
        const systemPrompt = (config && config.onboard_prompt) || ONBOARD_SYSTEM;
        
        const openai = getAIClient();
        const response = await openai.chat.completions.create({
            model: getModel(),
            stream: false,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ]
        });

        fullReply = response.choices?.[0]?.message?.content || '';
        if (fullReply) {
            res.write(`data: ${JSON.stringify({ chunk: fullReply })}\n\n`);
        }
    } catch (err) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    }

    // Check if requirements extracted
    const match = fullReply.match(/<REQUIREMENTS>([\s\S]*?)<\/REQUIREMENTS>/);
    if (match) {
        try {
            const reqs = JSON.parse(match[1].trim());
            res.write(`data: ${JSON.stringify({ requirements: reqs })}\n\n`);
        } catch {}
    }

    res.write('data: [DONE]\n\n');
    res.end();
});

// GET /api/projects
router.get('/', (req, res) => {
    res.json(db.listProjects());
});

// POST /api/projects — create + kick off planning
router.post('/', async (req, res) => {
    const { name, task, importPath, onboardMessages } = req.body;
    if (!name || !task) return res.status(400).json({ error: 'name and task required' });

    const id = nanoid(10);
    const wsDir = path.join(WORKSPACE_ROOT, id);
    if (!fs.existsSync(wsDir)) fs.mkdirSync(wsDir, { recursive: true });

    const config = db.getOfficeConfig();
    const isCustom = config && config.template && config.template !== 'software_dev';
    const initialFsmState = isCustom ? 'stage_0_active' : 'planning_active';
    const stages = (config && config.stages) || db.DEFAULT_STAGES;

    db.createProject(id, name, task, config ? config.template : 'software_dev', stages);

    // Save onboarding chat history
    if (onboardMessages && Array.isArray(onboardMessages)) {
        onboardMessages.forEach(msg => {
            if (msg.content) {
                db.insertChat(id, msg.role, msg.content, 'onboarding');
            }
        });
    }

    // If importing, copy files
    if (importPath && fs.existsSync(importPath)) {
        try {
            copyProjectFiles(importPath, wsDir, id);
        } catch (err) {
            console.error('Import error:', err);
        }
    }

    // Initialize Kanban based on stages
    const kanban = stages.map((s, idx) => ({
        id: String(idx + 1),
        title: s.name,
        status: idx === 0 ? 'in-progress' : 'todo'
    }));

    db.initPipelineState(id, kanban);
    db.updateFsmState(id, initialFsmState);

    const pipeline = sm.buildPipelineSteps(initialFsmState, stages);
    res.json({ projectId: id, pipeline, kanban, fsmState: initialFsmState });

    const firstStageId = isCustom ? stages[0].id : 'planning';
    setImmediate(() => aiWorker.runStage(id, firstStageId));
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
    const project = db.getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    const state = db.getPipelineState(req.params.id);
    const chatLog = db.getChatLog(req.params.id);
    
    const stages = db.getProjectStages(req.params.id);
    const pipeline = sm.buildPipelineSteps(state.fsm_state, stages);
    const absolutePath = path.join(WORKSPACE_ROOT, req.params.id);
    res.json({ project, state, pipeline, chatLog, files: state.files, absolutePath });
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
    const id = req.params.id;
    try {
        db.deleteProject(id);
        const wsDir = path.join(WORKSPACE_ROOT, id);
        if (fs.existsSync(wsDir)) {
            fs.rmSync(wsDir, { recursive: true, force: true });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Delete project error:', err);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

module.exports = router;
