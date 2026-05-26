const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/factory.db');
let db;

function initDb() {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id         TEXT PRIMARY KEY,
            name       TEXT NOT NULL,
            task       TEXT NOT NULL,
            created_at INTEGER
        );

        CREATE TABLE IF NOT EXISTS pipeline_state (
            project_id TEXT PRIMARY KEY,
            fsm_state  TEXT NOT NULL,
            kanban     TEXT,
            files      TEXT
        );

        CREATE TABLE IF NOT EXISTS chat_log (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT NOT NULL,
            ts         INTEGER NOT NULL,
            role       TEXT NOT NULL,
            message    TEXT NOT NULL,
            stage      TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_chat_project ON chat_log(project_id, ts);

        CREATE TABLE IF NOT EXISTS office_config (
            id          TEXT PRIMARY KEY DEFAULT 'default',
            template    TEXT NOT NULL DEFAULT 'software_dev',
            name        TEXT NOT NULL DEFAULT 'Software Dev Office',
            stages      TEXT NOT NULL,
            onboard_prompt TEXT,
            ai_model    TEXT,
            ai_base_url TEXT,
            ai_api_key  TEXT,
            mcp_servers TEXT,
            git_token   TEXT,
            git_username TEXT,
            updated_at  INTEGER
        );

        CREATE TABLE IF NOT EXISTS custom_templates (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            icon        TEXT NOT NULL,
            description TEXT NOT NULL,
            stages      TEXT NOT NULL,
            onboard_prompt TEXT,
            created_at  INTEGER
        );
    `);

    // Migrations
    try {
        db.exec("ALTER TABLE projects ADD COLUMN template TEXT");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE projects ADD COLUMN stages TEXT");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE office_config ADD COLUMN mcp_servers TEXT");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE office_config ADD COLUMN git_token TEXT");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE office_config ADD COLUMN git_username TEXT");
    } catch (e) {}

    // Seed default config if not exists
    _seedDefaultConfig();
    return db;
}

function getDb() {
    if (!db) throw new Error('DB not initialized');
    return db;
}

// Projects
function createProject(id, name, task, template = 'software_dev', stages = null) {
    getDb().prepare(`INSERT INTO projects (id, name, task, created_at, template, stages) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(id, name, task, Date.now(), template, stages ? JSON.stringify(stages) : null);
}

function getProjectStages(projectId) {
    const project = getProject(projectId);
    if (project && project.stages) {
        try {
            return JSON.parse(project.stages);
        } catch (e) {}
    }
    const config = getOfficeConfig();
    return (config && config.stages) || DEFAULT_STAGES;
}

function listProjects() {
    return getDb().prepare(`
        SELECT p.id, p.name, p.task, p.created_at, ps.fsm_state
        FROM projects p
        LEFT JOIN pipeline_state ps ON ps.project_id = p.id
        ORDER BY p.created_at DESC
    `).all();
}

function getProject(id) {
    return getDb().prepare(`SELECT * FROM projects WHERE id = ?`).get(id);
}

function updateProjectTask(id, newTask) {
    getDb().prepare(`UPDATE projects SET task = ? WHERE id = ?`).run(newTask, id);
}

function deleteProject(id) {
    getDb().prepare(`DELETE FROM chat_log WHERE project_id = ?`).run(id);
    getDb().prepare(`DELETE FROM pipeline_state WHERE project_id = ?`).run(id);
    getDb().prepare(`DELETE FROM projects WHERE id = ?`).run(id);
}

// Pipeline state
function initPipelineState(projectId, kanban) {
    getDb().prepare(`
        INSERT INTO pipeline_state (project_id, fsm_state, kanban, files)
        VALUES (?, 'idle', ?, '[]')
    `).run(projectId, JSON.stringify(kanban));
}

function getPipelineState(projectId) {
    const row = getDb().prepare(`SELECT * FROM pipeline_state WHERE project_id = ?`).get(projectId);
    if (!row) return null;
    return {
        ...row,
        kanban: JSON.parse(row.kanban || '[]'),
        files: JSON.parse(row.files || '[]')
    };
}

function updateFsmState(projectId, fsmState) {
    getDb().prepare(`UPDATE pipeline_state SET fsm_state = ? WHERE project_id = ?`)
        .run(fsmState, projectId);
}

function updateKanban(projectId, kanban) {
    getDb().prepare(`UPDATE pipeline_state SET kanban = ? WHERE project_id = ?`)
        .run(JSON.stringify(kanban), projectId);
}

function addFile(projectId, filename) {
    const state = getPipelineState(projectId);
    if (!state) return;
    const files = state.files;
    if (!files.includes(filename)) files.push(filename);
    getDb().prepare(`UPDATE pipeline_state SET files = ? WHERE project_id = ?`)
        .run(JSON.stringify(files), projectId);
}

// Chat log
function insertChat(projectId, role, message, stage) {
    getDb().prepare(`
        INSERT INTO chat_log (project_id, ts, role, message, stage)
        VALUES (?, ?, ?, ?, ?)
    `).run(projectId, Date.now(), role, message, stage || null);
    return getDb().prepare(`SELECT last_insert_rowid() as id`).get().id;
}

function getChatLog(projectId, limit = 200) {
    return getDb().prepare(`
        SELECT * FROM chat_log WHERE project_id = ? ORDER BY ts ASC LIMIT ?
    `).all(projectId, limit);
}

// Office Config
const DEFAULT_STAGES = [
    { id: 'planning', name: 'Planning', role: 'Product Manager', chatRole: 'architect', promptFile: 'pm.md', customPrompt: null, outputFiles: ['blueprint.md', 'prd.md'], enabled: true },
    { id: 'design', name: 'Design', role: 'UX Designer', chatRole: 'designer', promptFile: 'ux.md', customPrompt: null, outputFiles: ['mockup.md', 'design-tokens.json', 'ux-spec.md'], enabled: true },
    { id: 'frontend', name: 'Frontend', role: 'Frontend Engineer', chatRole: 'dev1', promptFile: 'frontend.md', customPrompt: null, outputFiles: [], enabled: true },
    { id: 'backend', name: 'Backend', role: 'Backend Engineer', chatRole: 'dev2', promptFile: 'backend.md', customPrompt: null, outputFiles: [], enabled: true },
    { id: 'qa', name: 'QA', role: 'QA Engineer', chatRole: 'qa', promptFile: 'qa.md', customPrompt: null, outputFiles: ['test-report.md', 'qa-strategy.md'], enabled: true },
    { id: 'deploy', name: 'Deploy', role: 'VP Engineering', chatRole: 'devops', promptFile: 'final.md', customPrompt: null, outputFiles: ['Dockerfile', 'docker-compose.yml', 'deployment-plan.md'], enabled: true }
];

function _seedDefaultConfig() {
    const exists = getDb().prepare(`SELECT id FROM office_config WHERE id = 'default'`).get();
    if (!exists) {
        getDb().prepare(`
            INSERT INTO office_config (id, template, name, stages, onboard_prompt, updated_at)
            VALUES ('default', 'software_dev', 'Software Dev Office', ?, NULL, ?)
        `).run(JSON.stringify(DEFAULT_STAGES), Date.now());
    }
}

function getOfficeConfig() {
    const row = getDb().prepare(`SELECT * FROM office_config WHERE id = 'default'`).get();
    if (!row) return null;
    return {
        ...row,
        stages: JSON.parse(row.stages || '[]')
    };
}

function updateOfficeConfig(updates) {
    const config = getOfficeConfig();
    if (!config) return;
    const { template, name, stages, onboard_prompt, ai_model, ai_base_url, ai_api_key, mcp_servers, git_token, git_username } = { ...config, ...updates };
    getDb().prepare(`
        UPDATE office_config 
        SET template = ?, name = ?, stages = ?, onboard_prompt = ?, ai_model = ?, ai_base_url = ?, ai_api_key = ?, mcp_servers = ?, git_token = ?, git_username = ?, updated_at = ?
        WHERE id = 'default'
    `).run(
        template, name, 
        typeof stages === 'string' ? stages : JSON.stringify(stages),
        onboard_prompt || null,
        ai_model || null, ai_base_url || null, ai_api_key || null, mcp_servers || null,
        git_token || null, git_username || null,
        Date.now()
    );
}

function updateStagePrompt(stageId, customPrompt) {
    const config = getOfficeConfig();
    if (!config) return;
    const stages = config.stages.map(s => 
        s.id === stageId ? { ...s, customPrompt: customPrompt || null } : s
    );
    getDb().prepare(`UPDATE office_config SET stages = ?, updated_at = ? WHERE id = 'default'`)
        .run(JSON.stringify(stages), Date.now());
}

function resetOfficeConfig() {
    getDb().prepare(`
        UPDATE office_config 
        SET template = 'software_dev', name = 'Software Dev Office', stages = ?, onboard_prompt = NULL, ai_model = NULL, ai_base_url = NULL, ai_api_key = NULL, mcp_servers = NULL, git_token = NULL, git_username = NULL, updated_at = ?
        WHERE id = 'default'
    `).run(JSON.stringify(DEFAULT_STAGES), Date.now());
}

// Custom Templates
function createCustomTemplate(id, name, icon, description, stages, onboardPrompt) {
    getDb().prepare(`
        INSERT INTO custom_templates (id, name, icon, description, stages, onboard_prompt, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, icon, description, JSON.stringify(stages), onboardPrompt || null, Date.now());
}

function listCustomTemplates() {
    return getDb().prepare(`SELECT * FROM custom_templates ORDER BY created_at DESC`).all();
}

function getCustomTemplate(id) {
    return getDb().prepare(`SELECT * FROM custom_templates WHERE id = ?`).get(id);
}

function deleteCustomTemplate(id) {
    getDb().prepare(`DELETE FROM custom_templates WHERE id = ?`).run(id);
}

module.exports = {
    initDb, getDb,
    createProject, listProjects, getProject, updateProjectTask, deleteProject,
    initPipelineState, getPipelineState, updateFsmState, updateKanban, addFile,
    insertChat, getChatLog,
    getOfficeConfig, updateOfficeConfig, updateStagePrompt, resetOfficeConfig,
    DEFAULT_STAGES,
    createCustomTemplate, listCustomTemplates, getCustomTemplate, deleteCustomTemplate,
    getProjectStages
};
