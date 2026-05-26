import React, { useState, useEffect, useCallback } from 'react';
import styles from './SettingsPage.module.css';
import { Setting2, ArrowLeft, Refresh2, Cloud, DocumentText, Edit2, TickCircle } from 'iconsax-react';

interface StageConfig {
  id: string;
  name: string;
  role: string;
  chatRole: string;
  promptFile: string;
  customPrompt: string | null;
  outputFiles: string[];
  enabled: boolean;
}

interface OfficeConfig {
  id: string;
  template: string;
  name: string;
  stages: StageConfig[];
  onboard_prompt: string | null;
  ai_model: string | null;
  ai_base_url: string | null;
  ai_api_key: string | null;
  mcp_servers: string | null;
  git_token: string | null;
  git_username: string | null;
}

interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  stageCount: number;
  stageNames: string[];
  isCustom?: boolean;
}

interface SettingsPageProps {
  onBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const [config, setConfig] = useState<OfficeConfig | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTab, setActiveTab] = useState<'templates' | 'roles' | 'connection'>('templates');
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [editingPrompts, setEditingPrompts] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Connection form state
  const [aiModel, setAiModel] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiApiKey, setAiApiKey] = useState('');
  const [mcpServers, setMcpServers] = useState('');
  const [gitToken, setGitToken] = useState('');
  const [gitUsername, setGitUsername] = useState('');
  const [onboardPrompt, setOnboardPrompt] = useState('');

  // Creator form state
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState('💼');
  const [customDescription, setCustomDescription] = useState('');
  const [customOnboardPrompt, setCustomOnboardPrompt] = useState('');
  const [customStages, setCustomStages] = useState<Array<{
    id: string;
    name: string;
    role: string;
    chatRole: string;
    promptFile: string;
    customPrompt: string;
    outputFiles: string;
    requiresReview: boolean;
  }>>([
    { id: 'stage_0', name: 'Planning', role: 'Product Manager', chatRole: 'architect', promptFile: 'pm.md', customPrompt: '', outputFiles: 'blueprint.md, prd.md', requiresReview: true }
  ]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleAddStage = () => {
    const nextIdx = customStages.length;
    setCustomStages([...customStages, {
      id: `stage_${nextIdx}`,
      name: `Stage ${nextIdx + 1}`,
      role: `Custom Agent ${nextIdx + 1}`,
      chatRole: `agent${nextIdx + 1}`,
      promptFile: 'pm.md',
      customPrompt: '',
      outputFiles: '',
      requiresReview: true
    }]);
  };

  const handleRemoveStage = (idx: number) => {
    if (customStages.length <= 1) {
      alert('At least one stage is required');
      return;
    }
    const updated = customStages.filter((_, i) => i !== idx).map((s, i) => ({
      ...s,
      id: `stage_${i}`,
      name: s.name.startsWith('Stage ') ? `Stage ${i + 1}` : s.name
    }));
    setCustomStages(updated);
  };

  const handleCreateTemplate = async () => {
    if (!customName.trim()) {
      alert('Template Name is required');
      return;
    }
    
    const stagesPayload = customStages.map(s => ({
      id: s.id,
      name: s.name || s.id,
      role: s.role || s.id,
      chatRole: s.chatRole,
      promptFile: s.promptFile,
      customPrompt: s.customPrompt.trim() || null,
      outputFiles: s.outputFiles.split(',').map(f => f.trim()).filter(Boolean),
      requiresReview: s.requiresReview,
      enabled: true
    }));
    
    try {
      const res = await fetch('/api/settings/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customName,
          icon: customIcon,
          description: customDescription,
          stages: stagesPayload,
          onboard_prompt: customOnboardPrompt.trim() || null
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create template');
      }
      
      showToast('✓ Template Created!');
      setIsCreatingCustom(false);
      setCustomName('');
      setCustomIcon('💼');
      setCustomDescription('');
      setCustomOnboardPrompt('');
      setCustomStages([
        { id: 'stage_0', name: 'Planning', role: 'Product Manager', chatRole: 'architect', promptFile: 'pm.md', customPrompt: '', outputFiles: 'blueprint.md, prd.md', requiresReview: true }
      ]);
      fetchTemplates();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this custom template?')) return;
    try {
      const res = await fetch(`/api/settings/templates/${templateId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete template');
      }
      showToast('✓ Template Deleted');
      fetchTemplates();
      fetchConfig();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setConfig(data);
      setAiModel(data.ai_model || '');
      setAiBaseUrl(data.ai_base_url || '');
      setAiApiKey(data.ai_api_key || '');
      setMcpServers(data.mcp_servers || '');
      setGitToken(data.git_token || '');
      setGitUsername(data.git_username || '');
      setOnboardPrompt(data.onboard_prompt || '');
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/templates');
      const data = await res.json();
      setTemplates(data);
    } catch (e) {
      console.error('Failed to fetch templates', e);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchConfig(), fetchTemplates()]).finally(() => setLoading(false));
  }, [fetchConfig, fetchTemplates]);

  const applyTemplate = async (templateId: string) => {
    try {
      const res = await fetch(`/api/settings/template/${templateId}`, { method: 'PUT' });
      const data = await res.json();
      setConfig(data);
      setEditingPrompts({});
      showToast('✓ Template Applied!');
    } catch (e) {
      console.error(e);
    }
  };

  const saveStagePrompt = async (stageId: string) => {
    const customPrompt = editingPrompts[stageId];
    try {
      const res = await fetch(`/api/settings/stages/${stageId}/prompt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customPrompt: customPrompt || null })
      });
      const data = await res.json();
      setConfig(data);
      showToast('✓ Prompt Saved!');
    } catch (e) {
      console.error(e);
    }
  };

  const clearStagePrompt = async (stageId: string) => {
    try {
      const res = await fetch(`/api/settings/stages/${stageId}/prompt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customPrompt: null })
      });
      const data = await res.json();
      setConfig(data);
      setEditingPrompts(prev => { const n = {...prev}; delete n[stageId]; return n; });
      showToast('✓ Reset to Default');
    } catch (e) {
      console.error(e);
    }
  };

  const saveConnection = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_model: aiModel || null,
          ai_base_url: aiBaseUrl || null,
          ai_api_key: aiApiKey || null,
          mcp_servers: mcpServers || null,
          git_token: gitToken || null,
          git_username: gitUsername || null,
          onboard_prompt: onboardPrompt || null
        })
      });
      const data = await res.json();
      setConfig(data);
      showToast('✓ Settings Saved!');
    } catch (e) {
      console.error(e);
    }
  };

  const resetAll = async () => {
    if (!confirm('Reset all settings to default? This will remove all custom prompts and template changes.')) return;
    try {
      const res = await fetch('/api/settings/reset', { method: 'POST' });
      const data = await res.json();
      setConfig(data);
      setAiModel('');
      setAiBaseUrl('');
      setAiApiKey('');
      setMcpServers('');
      setGitToken('');
      setGitUsername('');
      setOnboardPrompt('');
      setEditingPrompts({});
      showToast('✓ Reset Complete!');
    } catch (e) {
      console.error(e);
    }
  };

  const toggleRoleExpand = (stageId: string) => {
    if (expandedRole === stageId) {
      setExpandedRole(null);
    } else {
      setExpandedRole(stageId);
      // Pre-load current prompt
      if (!editingPrompts[stageId]) {
        const stage = config?.stages.find(s => s.id === stageId);
        if (stage?.customPrompt) {
          setEditingPrompts(prev => ({ ...prev, [stageId]: stage.customPrompt! }));
        } else {
          // Fetch default prompt
          fetch(`/api/settings/stages/${stageId}/default-prompt`)
            .then(r => r.json())
            .then(data => {
              if (data.prompt) {
                setEditingPrompts(prev => ({ ...prev, [stageId]: data.prompt }));
              }
            });
        }
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.settingsContainer}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, textTransform: 'uppercase' }}>
          Loading Settings...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.settingsContainer}>
      {/* Header */}
      <div className={styles.settingsHeader}>
        <div className={styles.settingsTitle}>
          <Setting2 size="32" color="#000" variant="Bold" />
          Settings
        </div>
        <div className={styles.headerActions}>
          <button className={styles.resetBtn} onClick={resetAll}>
            <Refresh2 size="16" color="#fff" variant="Bold" /> Reset
          </button>
          <button className={styles.backBtn} onClick={onBack}>
            <ArrowLeft size="16" color="#000" variant="Bold" /> Back
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        <button
          className={`${styles.tabNavBtn} ${activeTab === 'templates' ? styles.activeNavTab : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          🏢 Office Template
        </button>
        <button
          className={`${styles.tabNavBtn} ${activeTab === 'roles' ? styles.activeNavTab : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          🤖 AI Roles & Prompts
        </button>
        <button
          className={`${styles.tabNavBtn} ${activeTab === 'connection' ? styles.activeNavTab : ''}`}
          onClick={() => setActiveTab('connection')}
        >
          ⚙️ AI Model & Connection
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabBody}>
        {/* TAB 1: Office Templates */}
        {activeTab === 'templates' && (
          <div>
            {isCreatingCustom ? (
              <div className={styles.creatorForm}>
                <div className={styles.creatorSection}>
                  <div className={styles.creatorTitle}>Create Custom Template</div>
                  <div className={styles.creatorInputsRow}>
                    <div className={styles.creatorField}>
                      <label className={styles.configLabel}>Template Name</label>
                      <input
                        type="text"
                        className={styles.configInput}
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="e.g. My Custom Workflow"
                      />
                    </div>
                    <div className={styles.creatorField}>
                      <label className={styles.configLabel}>Icon (Emoji)</label>
                      <input
                        type="text"
                        className={styles.configInput}
                        value={customIcon}
                        onChange={(e) => setCustomIcon(e.target.value)}
                        placeholder="e.g. 🚀"
                      />
                    </div>
                    <div className={`${styles.creatorField} ${styles.fullWidth}`}>
                      <label className={styles.configLabel}>Description</label>
                      <input
                        type="text"
                        className={styles.configInput}
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder="Brief description of this workflow"
                      />
                    </div>
                    <div className={`${styles.creatorField} ${styles.fullWidth}`}>
                      <label className={styles.configLabel}>Custom Onboarding Prompt (Optional)</label>
                      <textarea
                        className={styles.promptTextarea}
                        style={{ minHeight: '100px' }}
                        value={customOnboardPrompt}
                        onChange={(e) => setCustomOnboardPrompt(e.target.value)}
                        placeholder="System instructions for brainstorming the project during onboarding..."
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.creatorSection}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'var(--neo-border)', paddingBottom: '8px', marginBottom: '8px' }}>
                    <div className={styles.creatorTitle} style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>Pipeline Stages</div>
                    <button className={styles.submitBtn} style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleAddStage}>
                      ➕ Add Stage
                    </button>
                  </div>
                  <div className={styles.stagesGrid}>
                    {customStages.map((stage, idx) => (
                      <div key={stage.id} className={styles.stageCard} style={{ position: 'relative' }}>
                        {customStages.length > 1 && (
                          <button
                            className={styles.deleteTemplateBtn}
                            style={{ top: '12px', bottom: 'auto', right: '12px' }}
                            onClick={() => handleRemoveStage(idx)}
                          >
                            ❌ Remove
                          </button>
                        )}
                        <div className={styles.stageCardHeader}>
                          Stage {idx + 1}
                        </div>
                        <div className={styles.creatorField}>
                          <label className={styles.configLabel}>Stage Name</label>
                          <input
                            type="text"
                            className={styles.configInput}
                            value={stage.name}
                            onChange={(e) => {
                              const updated = [...customStages];
                              updated[idx].name = e.target.value;
                              setCustomStages(updated);
                            }}
                            placeholder="e.g. Riset"
                          />
                        </div>
                        <div className={styles.creatorField}>
                          <label className={styles.configLabel}>Agent Role</label>
                          <input
                            type="text"
                            className={styles.configInput}
                            value={stage.role}
                            onChange={(e) => {
                              const updated = [...customStages];
                              updated[idx].role = e.target.value;
                              setCustomStages(updated);
                            }}
                            placeholder="e.g. Peneliti Utama"
                          />
                        </div>
                        <div className={styles.creatorField}>
                          <label className={styles.configLabel}>Output Files (comma separated)</label>
                          <input
                            type="text"
                            className={styles.configInput}
                            value={stage.outputFiles}
                            onChange={(e) => {
                              const updated = [...customStages];
                              updated[idx].outputFiles = e.target.value;
                              setCustomStages(updated);
                            }}
                            placeholder="e.g. data.md, hasil.md"
                          />
                        </div>
                        <div className={styles.creatorField}>
                          <label className={styles.configLabel}>Agent System Prompt Override (Optional)</label>
                          <textarea
                            className={styles.promptTextarea}
                            style={{ minHeight: '120px' }}
                            value={stage.customPrompt}
                            onChange={(e) => {
                              const updated = [...customStages];
                              updated[idx].customPrompt = e.target.value;
                              setCustomStages(updated);
                            }}
                            placeholder="System instructions for this agent..."
                          />
                        </div>
                        <div className={styles.creatorField} style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <input
                            type="checkbox"
                            checked={stage.requiresReview}
                            onChange={(e) => {
                              const updated = [...customStages];
                              updated[idx].requiresReview = e.target.checked;
                              setCustomStages(updated);
                            }}
                            id={`requiresReview-${stage.id}`}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <label htmlFor={`requiresReview-${stage.id}`} className={styles.configLabel} style={{ cursor: 'pointer' }}>Requires Approval / Review</label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.btnGroup}>
                  <button className={styles.submitBtn} onClick={handleCreateTemplate}>
                    ✓ Save Custom Template
                  </button>
                  <button className={styles.cancelBtn} onClick={() => setIsCreatingCustom(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                  <button className={styles.submitBtn} onClick={() => setIsCreatingCustom(true)}>
                    ➕ Create Custom Template
                  </button>
                </div>
                <div className={styles.templateGrid}>
                  {templates.length === 0 && <div style={{ color: 'red' }}>Templates array is empty!</div>}
                  {templates.map(t => (
                    <div
                      key={t.id}
                      className={`${styles.templateCard} ${config?.template === t.id ? styles.activeTemplate : ''}`}
                      onClick={() => applyTemplate(t.id)}
                    >
                      {config?.template === t.id && (
                        <div className={styles.activeBadge}>
                          <TickCircle size="12" color="#fff" variant="Bold" /> Active
                        </div>
                      )}
                      <div className={styles.templateIcon}>{t.icon}</div>
                      <div className={styles.templateName}>{t.name}</div>
                      <div className={styles.templateDesc}>{t.description}</div>
                      <div className={styles.templateStages}>
                        {t.stageNames.map((s, i) => (
                          <span key={i} className={styles.stagePill}>{s}</span>
                        ))}
                      </div>
                      {t.isCustom && (
                        <button
                          className={styles.deleteTemplateBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(t.id);
                          }}
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AI Roles & Prompts */}
        {activeTab === 'roles' && config && (
          <div className={styles.rolesList}>
            {config.stages.map((stage, idx) => (
              <div key={stage.id} className={styles.roleCard}>
                <div
                  className={styles.roleHeader}
                  onClick={() => toggleRoleExpand(stage.id)}
                >
                  <div className={styles.roleInfo}>
                    <div className={styles.roleName}>
                      {idx + 1}. {stage.role}
                    </div>
                    <div className={styles.roleStage}>
                      Stage: {stage.name} {stage.customPrompt ? '· Custom Override' : `· File: ${stage.promptFile}`}
                    </div>
                  </div>
                  <div className={styles.roleActions}>
                    <span className={`${styles.promptBadge} ${!stage.customPrompt ? styles.isDefault : ''}`}>
                      {stage.customPrompt ? 'Custom' : 'Default'}
                    </span>
                    <span className={`${styles.expandIcon} ${expandedRole === stage.id ? styles.expanded : ''}`}>
                      ▼
                    </span>
                  </div>
                </div>

                {expandedRole === stage.id && (
                  <div className={styles.promptEditor}>
                    <div className={styles.defaultToggle}>
                      <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase' }}>
                        <Edit2 size="14" color="#000" variant="Bold" /> Edit System Prompt for {stage.role}
                      </span>
                    </div>

                    <textarea
                      className={styles.promptTextarea}
                      value={editingPrompts[stage.id] || ''}
                      onChange={(e) => setEditingPrompts(prev => ({ ...prev, [stage.id]: e.target.value }))}
                      placeholder={`Enter custom prompt for ${stage.role}...`}
                      rows={12}
                    />

                    <div className={styles.editorActions}>
                      <button className={styles.saveBtn} onClick={() => saveStagePrompt(stage.id)}>
                        <TickCircle size="16" color="#000" variant="Bold" /> Save Prompt
                      </button>
                      <button className={styles.clearBtn} onClick={() => clearStagePrompt(stage.id)}>
                        <Refresh2 size="16" color="#000" variant="Bold" /> Reset to Default
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: AI Model & Connection */}
        {activeTab === 'connection' && (
          <div>
            <div className={styles.configSection}>
              <div className={styles.configTitle}>
                <Cloud size="24" color="#000" variant="Bold" />
                AI Model Configuration
              </div>
              <div className={styles.configGrid}>
                <div className={styles.configField}>
                  <label className={styles.configLabel}>AI Model</label>
                  <input
                    type="text"
                    className={styles.configInput}
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder="e.g. kr/claude-sonnet-4-5"
                  />
                  <span className={styles.configHint}>Leave empty to use .env default</span>
                </div>
                <div className={styles.configField}>
                  <label className={styles.configLabel}>Base URL</label>
                  <input
                    type="text"
                    className={styles.configInput}
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder="e.g. http://localhost:20128/v1"
                  />
                  <span className={styles.configHint}>OpenAI-compatible API endpoint</span>
                </div>
                <div className={`${styles.configField} ${styles.fullWidth}`}>
                  <label className={styles.configLabel}>API Key</label>
                  <input
                    type="password"
                    className={styles.configInput}
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder="sk-..."
                  />
                  <span className={styles.configHint}>Leave empty to use .env default. Stored in local database.</span>
                </div>
              </div>
            </div>

            <div className={`${styles.configSection} ${styles.onboardSection}`}>
              <div className={styles.configTitle}>
                <DocumentText size="24" color="#000" variant="Bold" />
                Onboarding Chat Prompt
              </div>
              <p style={{ fontSize: 13, color: '#666', marginBottom: 16, fontWeight: 500 }}>
                This is the system prompt used when chatting with the AI team during project onboarding. Leave empty to use the default prompt.
              </p>
              <textarea
                className={styles.promptTextarea}
                value={onboardPrompt}
                onChange={(e) => setOnboardPrompt(e.target.value)}
                placeholder="Custom onboarding system prompt... (leave empty for default)"
                rows={8}
              />
            </div>

            <div className={`${styles.configSection} ${styles.onboardSection}`}>
              <div className={styles.configTitle}>
                <Cloud size="24" color="#000" variant="Bold" />
                MCP Servers Configuration (JSON)
              </div>
              <p style={{ fontSize: 13, color: '#666', marginBottom: 16, fontWeight: 500 }}>
                Configure Model Context Protocol (MCP) servers (e.g. Supabase, FileSystem) in JSON format.
              </p>
              <textarea
                className={styles.promptTextarea}
                value={mcpServers}
                onChange={(e) => setMcpServers(e.target.value)}
                placeholder='{&#10;  "mcpServers": {&#10;    "supabase": {&#10;      "command": "npx",&#10;      "args": ["-y", "@supabase/mcp"]&#10;    }&#10;  }&#10;}'
                rows={8}
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div className={`${styles.configSection} ${styles.onboardSection}`}>
              <div className={styles.configTitle}>
                <Cloud size="24" color="#000" variant="Bold" />
                Git Configuration
              </div>
              <p style={{ fontSize: 13, color: '#666', marginBottom: 16, fontWeight: 500 }}>
                Set your GitHub username and Personal Access Token to allow pushing projects directly to your repository.
              </p>
              <div className={styles.configGrid}>
                <div className={styles.configField}>
                  <label className={styles.configLabel}>GitHub Username</label>
                  <input
                    type="text"
                    className={styles.configInput}
                    value={gitUsername}
                    onChange={(e) => setGitUsername(e.target.value)}
                    placeholder="e.g. johndoe"
                  />
                </div>
                <div className={styles.configField}>
                  <label className={styles.configLabel}>Personal Access Token (PAT)</label>
                  <input
                    type="password"
                    className={styles.configInput}
                    value={gitToken}
                    onChange={(e) => setGitToken(e.target.value)}
                    placeholder="ghp_..."
                  />
                  <span className={styles.configHint}>Requires 'repo' scope</span>
                </div>
              </div>
            </div>

            <button className={styles.configSaveBtn} onClick={saveConnection}>
              <TickCircle size="18" color="#000" variant="Bold" /> Save All Settings
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
};
