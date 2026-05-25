const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');

const PROMPTS_DIR = path.join(__dirname, '../prompts');

// Office template presets
const TEMPLATES = {
    software_dev: {
        id: 'software_dev',
        name: 'Software Dev Office',
        icon: '🖥️',
        description: 'Full-stack software development pipeline',
        stages: [
            { id: 'planning', name: 'Planning', role: 'Product Manager', chatRole: 'architect', promptFile: 'pm.md', customPrompt: null, outputFiles: ['blueprint.md', 'prd.md'], enabled: true },
            { id: 'design', name: 'Design', role: 'UX Designer', chatRole: 'designer', promptFile: 'ux.md', customPrompt: null, outputFiles: ['mockup.md', 'design-tokens.json', 'ux-spec.md'], enabled: true },
            { id: 'frontend', name: 'Frontend', role: 'Frontend Engineer', chatRole: 'dev1', promptFile: 'frontend.md', customPrompt: null, outputFiles: ['index.html', 'style.css', 'app.js', 'package.json'], enabled: true },
            { id: 'backend', name: 'Backend', role: 'Backend Engineer', chatRole: 'dev2', promptFile: 'backend.md', customPrompt: null, outputFiles: ['server.js', 'schema.sql', 'package.json'], enabled: true },
            { id: 'qa', name: 'QA', role: 'QA Engineer', chatRole: 'qa', promptFile: 'qa.md', customPrompt: null, outputFiles: ['test-report.md', 'qa-strategy.md'], enabled: true },
            { id: 'deploy', name: 'Deploy', role: 'VP Engineering', chatRole: 'devops', promptFile: 'final.md', customPrompt: null, outputFiles: ['Dockerfile', 'docker-compose.yml', 'deployment-plan.md'], enabled: true }
        ]
    },
    marketing_agency: {
        id: 'marketing_agency',
        name: 'Marketing Agency',
        icon: '📢',
        description: 'Marketing campaign and content pipeline',
        stages: [
            { id: 'planning', name: 'Brief', role: 'Marketing Strategist', chatRole: 'architect', promptFile: 'pm.md', customPrompt: 'You are a Marketing Strategist. Create a comprehensive marketing brief including target audience analysis, campaign objectives, key messaging, channels, budget allocation, and KPIs. Be specific and data-driven.', outputFiles: ['marketing-brief.md', 'audience-analysis.md'], enabled: true },
            { id: 'design', name: 'Creative', role: 'Creative Director', chatRole: 'designer', promptFile: 'ux.md', customPrompt: 'You are a Creative Director. Based on the marketing brief, create a creative direction document including brand voice guide, visual direction, campaign themes, ad copy concepts, and content calendar. Include mood references and style guidelines.', outputFiles: ['creative-direction.md', 'brand-guide.md'], enabled: true },
            { id: 'frontend', name: 'Copywriting', role: 'Copywriter', chatRole: 'dev1', promptFile: 'frontend.md', customPrompt: 'You are an expert Copywriter. Based on the brief and creative direction, write all campaign copy: headlines, taglines, social media posts, email sequences, landing page copy, and ad copy variations. Include A/B test variants.', outputFiles: ['campaign-copy.md', 'social-posts.md', 'email-sequence.md'], enabled: true },
            { id: 'backend', name: 'Content', role: 'Content Producer', chatRole: 'dev2', promptFile: 'backend.md', customPrompt: 'You are a Content Producer. Create detailed content production specs: blog articles, video scripts, infographic outlines, podcast episode plans, and asset specifications for each channel in the campaign.', outputFiles: ['content-plan.md', 'video-scripts.md', 'blog-articles.md'], enabled: true },
            { id: 'qa', name: 'Review', role: 'Brand Reviewer', chatRole: 'qa', promptFile: 'qa.md', customPrompt: 'You are a Brand Reviewer. Review all campaign materials for brand consistency, messaging accuracy, target audience alignment, legal compliance, and quality standards. Provide a detailed review with VERDICT: PASS or VERDICT: FAIL.', outputFiles: ['review-report.md'], enabled: true },
            { id: 'deploy', name: 'Launch', role: 'Campaign Manager', chatRole: 'devops', promptFile: 'final.md', customPrompt: 'You are a Campaign Manager. Create the final launch plan: channel-by-channel timeline, publishing schedule, tracking setup, analytics dashboard specs, and post-launch monitoring plan.', outputFiles: ['launch-plan.md', 'analytics-setup.md'], enabled: true }
        ]
    },
    design_studio: {
        id: 'design_studio',
        name: 'Design Studio',
        icon: '🎨',
        description: 'Brand and visual design pipeline',
        stages: [
            { id: 'planning', name: 'Research', role: 'Design Researcher', chatRole: 'architect', promptFile: 'pm.md', customPrompt: 'You are a Design Researcher. Conduct thorough research: competitor visual analysis, design trends, target audience preferences, industry benchmarks, and inspiration references. Create a research document with visual direction recommendations.', outputFiles: ['design-research.md', 'competitor-analysis.md'], enabled: true },
            { id: 'design', name: 'Moodboard', role: 'Art Director', chatRole: 'designer', promptFile: 'ux.md', customPrompt: 'You are an Art Director. Based on research, create a detailed moodboard document: color palettes (with hex codes), typography selections, texture/pattern direction, photography style, illustration style, and overall visual mood. Include rationale for each choice.', outputFiles: ['moodboard.md', 'color-palette.json', 'typography-guide.md'], enabled: true },
            { id: 'frontend', name: 'Design', role: 'Visual Designer', chatRole: 'dev1', promptFile: 'frontend.md', customPrompt: 'You are a Visual Designer. Create the actual design specifications: logo concepts with descriptions, layout systems, component designs, brand guidelines, and design system documentation. Include detailed specs for each visual element.', outputFiles: ['design-system.md', 'brand-guidelines.md', 'components.md'], enabled: true },
            { id: 'backend', name: 'Assets', role: 'Production Designer', chatRole: 'dev2', promptFile: 'backend.md', customPrompt: 'You are a Production Designer. Create production-ready asset specifications: file formats, sizes, export settings for all platforms, responsive breakpoints, animation specs, and print-ready guidelines. Include all technical specs needed for implementation.', outputFiles: ['asset-specs.md', 'production-guide.md'], enabled: true },
            { id: 'qa', name: 'Revision', role: 'Design Critic', chatRole: 'qa', promptFile: 'qa.md', customPrompt: 'You are a Design Critic. Review all design deliverables for consistency, accessibility (WCAG), brand alignment, technical feasibility, and visual quality. Provide detailed feedback with VERDICT: PASS or VERDICT: FAIL.', outputFiles: ['design-review.md'], enabled: true },
            { id: 'deploy', name: 'Delivery', role: 'Design Lead', chatRole: 'devops', promptFile: 'final.md', customPrompt: 'You are a Design Lead. Create the final handoff document: complete asset inventory, implementation guidelines, developer handoff notes, brand usage rules, and maintenance plan for the design system.', outputFiles: ['handoff-document.md', 'asset-inventory.md'], enabled: true }
        ]
    },
    content_factory: {
        id: 'content_factory',
        name: 'Content Factory',
        icon: '📝',
        description: 'Article, blog, and content creation pipeline',
        stages: [
            { id: 'planning', name: 'Research', role: 'Content Strategist', chatRole: 'architect', promptFile: 'pm.md', customPrompt: 'You are a Content Strategist. Research the topic thoroughly: keyword analysis, competitor content audit, audience intent mapping, content gap analysis, and SEO opportunities. Create a comprehensive content strategy document.', outputFiles: ['content-strategy.md', 'keyword-research.md'], enabled: true },
            { id: 'design', name: 'Outline', role: 'Senior Editor', chatRole: 'designer', promptFile: 'ux.md', customPrompt: 'You are a Senior Editor. Based on the content strategy, create detailed outlines for all content pieces: article structures, key points, supporting data needs, internal/external link opportunities, and CTA placements. Each outline should be detailed enough for a writer to follow.', outputFiles: ['content-outlines.md', 'editorial-calendar.md'], enabled: true },
            { id: 'frontend', name: 'Draft', role: 'Content Writer', chatRole: 'dev1', promptFile: 'frontend.md', customPrompt: 'You are an expert Content Writer. Write the full draft content based on the outlines: complete articles, blog posts, social media content, and any supporting materials. Write in an engaging, authoritative voice. Include headers, meta descriptions, and image alt text suggestions.', outputFiles: ['draft-articles.md', 'social-content.md'], enabled: true },
            { id: 'backend', name: 'SEO', role: 'SEO Specialist', chatRole: 'dev2', promptFile: 'backend.md', customPrompt: 'You are an SEO Specialist. Optimize all content: meta tags, heading structure, keyword density, internal linking strategy, schema markup suggestions, and technical SEO checklist. Provide specific optimization recommendations for each piece.', outputFiles: ['seo-optimization.md', 'meta-tags.md'], enabled: true },
            { id: 'qa', name: 'Edit', role: 'Editor-in-Chief', chatRole: 'qa', promptFile: 'qa.md', customPrompt: 'You are the Editor-in-Chief. Review all content for: grammar, style consistency, factual accuracy, readability score, SEO compliance, brand voice alignment, and overall quality. Provide line-by-line edits and suggestions with VERDICT: PASS or VERDICT: FAIL.', outputFiles: ['editorial-review.md'], enabled: true },
            { id: 'deploy', name: 'Publish', role: 'Publishing Manager', chatRole: 'devops', promptFile: 'final.md', customPrompt: 'You are a Publishing Manager. Create the final publishing plan: publication schedule, distribution channels, promotion strategy, analytics tracking setup, and content refresh schedule. Include cross-posting and syndication plans.', outputFiles: ['publishing-plan.md', 'distribution-strategy.md'], enabled: true }
        ]
    },
    video_production: {
        id: 'video_production',
        name: 'Video Production',
        icon: '🎬',
        description: 'Video content creation and production pipeline',
        stages: [
            { id: 'planning', name: 'Concept', role: 'Creative Producer', chatRole: 'architect', promptFile: 'pm.md', customPrompt: 'You are a Creative Producer. Develop the video concept: target audience, video goals, style/tone, key messages, distribution platforms, length, and format. Include competitor video analysis and trending formats.', outputFiles: ['video-concept.md', 'reference-analysis.md'], enabled: true },
            { id: 'design', name: 'Script', role: 'Screenwriter', chatRole: 'designer', promptFile: 'ux.md', customPrompt: 'You are a Screenwriter. Write the complete video script: narration/dialogue, scene descriptions, timing, music/sound cues, on-screen text, and CTA placement. Format as a professional two-column script with visual and audio columns.', outputFiles: ['video-script.md', 'shot-list.md'], enabled: true },
            { id: 'frontend', name: 'Storyboard', role: 'Storyboard Artist', chatRole: 'dev1', promptFile: 'frontend.md', customPrompt: 'You are a Storyboard Artist. Create a detailed storyboard document: scene-by-scene visual descriptions, camera angles, transitions, motion graphics specs, color grading direction, and thumbnail concepts. Include timing for each scene.', outputFiles: ['storyboard.md', 'visual-specs.md'], enabled: true },
            { id: 'backend', name: 'Production', role: 'Production Manager', chatRole: 'dev2', promptFile: 'backend.md', customPrompt: 'You are a Production Manager. Create the production plan: equipment list, location requirements, talent notes, B-roll needs, music licensing, graphics/animation specs, and production schedule. Include budget estimates and resource allocation.', outputFiles: ['production-plan.md', 'resource-list.md'], enabled: true },
            { id: 'qa', name: 'Review', role: 'Post-Production Supervisor', chatRole: 'qa', promptFile: 'qa.md', customPrompt: 'You are a Post-Production Supervisor. Review the complete production package: script quality, visual direction consistency, technical feasibility, brand alignment, and platform optimization. Provide detailed notes with VERDICT: PASS or VERDICT: FAIL.', outputFiles: ['review-notes.md'], enabled: true },
            { id: 'deploy', name: 'Post', role: 'Distribution Manager', chatRole: 'devops', promptFile: 'final.md', customPrompt: 'You are a Distribution Manager. Create the post-production and distribution plan: editing guidelines, export specs per platform, thumbnail designs, SEO metadata, posting schedule, cross-promotion plan, and analytics tracking.', outputFiles: ['distribution-plan.md', 'platform-specs.md'], enabled: true }
        ]
    },
    academic_thesis: {
        id: 'academic_thesis',
        name: 'Skripsi & Presentasi',
        icon: '🎓',
        description: 'Alur penulisan skripsi dari riset, bab 1-5, review bimbingan, hingga slides presentasi sidang yang menakjubkan.',
        stages: [
            { 
                id: 'planning', 
                name: 'Riset & Proposal', 
                role: 'Peneliti Akademik', 
                chatRole: 'architect', 
                promptFile: 'academic_proposal.md', 
                customPrompt: 'Anda adalah Peneliti Akademik Senior dan Koordinator Riset. Tugas Anda adalah menyusun proposal penelitian skripsi yang solid dan merencanakan struktur bab skripsi. Buatlah proposal riset komprehensif yang berisi latar belakang masalah, rumusan masalah, tujuan penelitian, batasan masalah, serta daftar isi skripsi yang terstruktur. Tentukan juga jadwal/timeline pengerjaan riset dari awal hingga sidang. Output utama haruslah dokumen proposal riset (skripsi-proposal.docx), rancangan daftar isi (rancangan-daftar-isi.docx), dan timeline penelitian (timeline-riset.xlsx).', 
                outputFiles: ['skripsi-proposal.docx', 'rancangan-daftar-isi.docx', 'timeline-riset.xlsx'], 
                enabled: true 
            },
            { 
                id: 'design', 
                name: 'Tinjauan Pustaka', 
                role: 'Spesialis Kajian Teori', 
                chatRole: 'designer', 
                promptFile: 'academic_theory.md', 
                customPrompt: 'Anda adalah Spesialis Kajian Teori dan Metodologi Penelitian. Berdasarkan proposal riset, buatlah Bab 2 (Tinjauan Pustaka / Landasan Teori) secara mendalam, serta rancang Bab 3 (Metodologi Penelitian). Uraikan teori-teori utama yang relevan, buat hipotesis jika ada, buat kerangka berpikir konseptual yang jelas, dan tentukan metode pengumpulan & analisis data (kualitatif/kuantitatif). Output utama Anda adalah Bab 2 Landasan Teori (bab2-landasan-teori.docx), Bab 3 Metodologi Penelitian (bab3-metodologi-penelitian.docx), dan skema kerangka berpikir (kerangka-berpikir.docx).', 
                outputFiles: ['bab2-landasan-teori.docx', 'bab3-metodologi-penelitian.docx', 'kerangka-berpikir.docx'], 
                enabled: true 
            },
            { 
                id: 'frontend', 
                name: 'Pendahuluan & Data', 
                role: 'Penulis Draf Utama', 
                chatRole: 'dev1', 
                promptFile: 'academic_intro.md', 
                customPrompt: 'Anda adalah Penulis Draf Utama Skripsi. Tugas Anda adalah menulis Bab 1 (Pendahuluan) secara lengkap dan mempersiapkan pengolahan data. Jabarkan latar belakang masalah secara sistematis (menggunakan metode piramida terbalik), rumusan masalah, tujuan, manfaat, dan struktur organisasi penulisan skripsi. Selain itu, buat draf instrumen penelitian (seperti kuesioner atau pedoman wawancara) dan draf tabel pengolahan data mentah. Output utama Anda adalah Bab 1 Pendahuluan (bab1-pendahuluan.docx), pedoman instrumen penelitian (instrumen-penelitian.docx), dan draf tabel analisis (draf-analisis-data.xlsx).', 
                outputFiles: ['bab1-pendahuluan.docx', 'instrumen-penelitian.docx', 'draf-analisis-data.xlsx'], 
                enabled: true 
            },
            { 
                id: 'backend', 
                name: 'Analisis & Hasil', 
                role: 'Analis Data & Pembahasan', 
                chatRole: 'dev2', 
                promptFile: 'academic_analysis.md', 
                customPrompt: 'Anda adalah Analis Data dan Pembahasan Hasil Penelitian. Tugas Anda adalah menyusun Bab 4 (Analisis & Pembahasan) dan Bab 5 (Kesimpulan & Saran), serta membuat daftar pustaka yang rapi. Lakukan analisis terhadap data yang diperoleh, hubungkan hasil analisis dengan teori di Bab 2, bahas implikasi temuan, susun kesimpulan yang menjawab rumusan masalah, serta berikan saran rekomendasi. Buat juga daftar pustaka (format APA atau IEEE). Output utama Anda adalah Bab 4 Analisis & Pembahasan (bab4-analisis-dan-pembahasan.docx), Bab 5 Kesimpulan & Saran (bab5-kesimpulan-dan-saran.docx), serta Daftar Pustaka (daftar-pustaka.docx).', 
                outputFiles: ['bab4-analisis-dan-pembahasan.docx', 'bab5-kesimpulan-dan-saran.docx', 'daftar-pustaka.docx'], 
                enabled: true 
            },
            { 
                id: 'qa', 
                name: 'Bimbingan & Review', 
                role: 'Dosen Pembimbing', 
                chatRole: 'qa', 
                promptFile: 'academic_review.md', 
                customPrompt: 'Anda adalah Dosen Pembimbing Skripsi Utama dan Reviewer Akademik. Tugas Anda adalah meninjau seluruh bab skripsi (Bab 1 sampai 5) dan daftar pustaka yang telah ditulis. Periksa tata bahasa Indonesia (EYD/PUEBI), konsistensi sitasi, ketajaman analisis hasil pembahasan, keselarasan antara kesimpulan dengan tujuan penelitian, serta format penulisan karya ilmiah. Berikan laporan bimbingan terperinci berupa catatan revisi untuk setiap bab, dan akhiri laporan Anda dengan penilaian kelayakan sidang: "VERDICT: PASS" (jika layak maju sidang) atau "VERDICT: FAIL" (jika perlu revisi besar terlebih dahulu). Output utama Anda adalah laporan bimbingan (laporan-bimbingan.docx) dan catatan revisi (catatan-revisi-dosen.docx).', 
                outputFiles: ['laporan-bimbingan.docx', 'catatan-revisi-dosen.docx'], 
                enabled: true 
            },
            { 
                id: 'deploy', 
                name: 'Kompilasi & Slide Presentasi', 
                role: 'Spesialis Presentasi Sidang', 
                chatRole: 'devops', 
                promptFile: 'academic_slides.md', 
                customPrompt: 'Anda adalah Spesialis Presentasi Sidang dan Editor Akademis Akhir. Tugas Anda adalah melakukan dua hal:\n1. Mengompilasi seluruh dokumen skripsi dari Bab 1 hingga Bab 5 dan Daftar Pustaka menjadi satu file dokumen skripsi lengkap (.docx) yang rapi.\n2. Membuat sebuah file presentasi sidang skripsi yang sangat menarik dan interaktif dalam format PowerPoint (.pptx) bernama \'presentasi-sidang.pptx\'.\n\nSlide presentasi harus didesain dengan visual yang sangat profesional, modern, dan premium.\nStruktur Slide Presentasi harus mencakup:\n1. Slide Judul: Judul Skripsi, Nama Mahasiswa, NIM, Logo/Universitas\n2. Slide Pendahuluan: Latar belakang singkat, rumusan masalah, tujuan penelitian\n3. Slide Landasan Teori & Kerangka Berpikir: Teori utama dan diagram alir konseptual\n4. Slide Metodologi: Jenis penelitian, sampel/sumber data, alur analisis\n5. Slide Hasil & Pembahasan: Temuan utama riset (tabel/poin visual yang jelas)\n6. Slide Kesimpulan & Saran: Kesimpulan akhir dan rekomendasi\n7. Slide Penutup: Ucapan terima kasih dan sesi tanya jawab.\n\nOutput utama Anda adalah: \'skripsi-lengkap.docx\', \'presentasi-sidang.pptx\', dan \'petunjuk-sidang-dan-tanya-jawab.docx\'.', 
                outputFiles: ['skripsi-lengkap.docx', 'presentasi-sidang.pptx', 'petunjuk-sidang-dan-tanya-jawab.docx'], 
                enabled: true 
            }
        ],
        onboard_prompt: `You are the Academic Committee of AI Office, a group of highly skilled academic experts:
- Alice (Dosen Pembimbing / PM): She acts as the supervisor, guiding the student on research scope, chapter outline, and timeline.
- Bob (Peneliti Metode): Specialize in methodology, data collection, and qualitative/quantitative research designs.
- Eve (Desainer Visual): Focuses on the structure of the PowerPoint slides, presentation design, and visuals.
- Charlie (Penulis Akademik): Expert in academic writing, drafting chapters, and formatting bibliography in APA/IEEE style.
- Sam (Proofreader / QA): Reviews the writing for academic rigor, grammar, structure, and plagiarism checks.

Your job is to brainstorm with the student to establish their thesis (skripsi) topic, research objectives, methodology, and scope.
When the user pitches a research topic, simulate a lively and professional academic discussion. Show enthusiasm and offer constructive feedback. At least 2 or 3 committee members should participate in each response to offer different perspectives (e.g., Alice guides, Bob suggests a method, Charlie suggests a literature angle, Eve discusses the slide visuals).
PREFIX every dialogue line with the character's name in bold, e.g., "**Alice (Pembimbing):** Topik yang sangat menarik! Apa kontribusi utama penelitian ini?"
CRITICAL RULE: You MUST speak entirely in Bahasa Indonesia (Indonesian language).

Once the student agrees on the final scope, Alice (Pembimbing) must output a JSON block wrapped in <REQUIREMENTS>...</REQUIREMENTS> tags containing:
{
  "name": "judul skripsi",
  "task": "deskripsi detail penelitian skripsi untuk dikerjakan tim",
  "techStack": ["metode penelitian, e.g. Kuantitatif/Kualitatif", "sumber data", "analisis data"],
  "targetUsers": "target pembaca/penerima manfaat penelitian",
  "features": ["bab 1 pendahuluan", "bab 2 tinjauan pustaka", "bab 3 metodologi", "bab 4 hasil pembahasan", "bab 5 kesimpulan", "ppt presentasi sidang"],
  "constraints": "batasan masalah / lingkup penelitian"
}
CRITICAL: If the user provides new information or requests changes AFTER you have already output the requirements, you MUST output the fully updated <REQUIREMENTS>...</REQUIREMENTS> JSON block again in your response.`
    }
};

// GET /api/settings — get current config
router.get('/', (req, res) => {
    try {
        const config = db.getOfficeConfig();
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/settings/templates — list available templates (presets + custom ones)
router.get('/templates', (req, res) => {
    try {
        const presets = Object.values(TEMPLATES).map(t => ({
            id: t.id,
            name: t.name,
            icon: t.icon,
            description: t.description,
            stageCount: t.stages.length,
            stageNames: t.stages.map(s => s.name),
            isCustom: false
        }));
        const customs = db.listCustomTemplates().map(t => {
            let parsedStages = [];
            try {
                parsedStages = JSON.parse(t.stages);
            } catch (e) {}
            return {
                id: t.id,
                name: t.name,
                icon: t.icon,
                description: t.description,
                stageCount: parsedStages.length,
                stageNames: parsedStages.map(s => s.name),
                isCustom: true
            };
        });
        res.json([...presets, ...customs]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/settings/templates — create custom template
router.post('/templates', (req, res) => {
    const { name, icon, description, stages, onboard_prompt } = req.body;
    if (!name || !stages || !Array.isArray(stages)) {
        return res.status(400).json({ error: 'Name and stages array are required' });
    }

    try {
        const id = 'custom_' + Date.now();
        db.createCustomTemplate(id, name, icon || '💼', description || '', stages, onboard_prompt || null);
        res.status(201).json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/settings/templates/:templateId — delete a custom template
router.delete('/templates/:templateId', (req, res) => {
    try {
        const config = db.getOfficeConfig();
        if (config && config.template === req.params.templateId) {
            return res.status(400).json({ error: 'Cannot delete the currently active template' });
        }
        db.deleteCustomTemplate(req.params.templateId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/settings — update config
router.put('/', (req, res) => {
    try {
        const updates = req.body;
        db.updateOfficeConfig(updates);
        res.json(db.getOfficeConfig());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/settings/template/:templateId — apply a template
router.put('/template/:templateId', (req, res) => {
    let template = TEMPLATES[req.params.templateId];

    if (!template) {
        try {
            const custom = db.getCustomTemplate(req.params.templateId);
            if (custom) {
                template = {
                    id: custom.id,
                    name: custom.name,
                    stages: JSON.parse(custom.stages),
                    onboard_prompt: custom.onboard_prompt
                };
            }
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    if (!template) return res.status(404).json({ error: 'Template not found' });

    try {
        db.updateOfficeConfig({
            template: template.id,
            name: template.name,
            stages: template.stages,
            onboard_prompt: template.onboard_prompt || null
        });
        res.json(db.getOfficeConfig());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/settings/stages/:stageId/prompt — update prompt for one stage
router.put('/stages/:stageId/prompt', (req, res) => {
    const { customPrompt } = req.body;
    try {
        db.updateStagePrompt(req.params.stageId, customPrompt);
        res.json(db.getOfficeConfig());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/settings/stages/:stageId/default-prompt — get the default .md prompt
router.get('/stages/:stageId/default-prompt', (req, res) => {
    const config = db.getOfficeConfig();
    const stage = config.stages.find(s => s.id === req.params.stageId);
    if (!stage) return res.status(404).json({ error: 'Stage not found' });

    const fp = path.join(PROMPTS_DIR, stage.promptFile);
    if (!fs.existsSync(fp)) return res.json({ prompt: null, file: stage.promptFile });

    const content = fs.readFileSync(fp, 'utf8');
    res.json({ prompt: content, file: stage.promptFile });
});

// POST /api/settings/reset — reset to defaults
router.post('/reset', (req, res) => {
    try {
        db.resetOfficeConfig();
        res.json(db.getOfficeConfig());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
