import { useState, useEffect } from 'react';
import styles from './App.module.css';
import { Sidebar } from './components/Sidebar';
import type { Project } from './components/Sidebar';
import { OnboardingChat } from './components/OnboardingChat';
import { PipelineStepper } from './components/PipelineStepper';
import { OfficeScene } from './components/OfficeScene';
import { KanbanBoard } from './components/KanbanBoard';
import { ChatLog } from './components/ChatLog';
import { MarkdownViewer } from './components/MarkdownViewer';
import { SettingsPage } from './components/SettingsPage';
import { usePipelineStream } from './hooks/usePipelineStream';
import { Warning2, Building, MessageText, ClipboardTick, Folder2, DocumentText, TickCircle, CloseCircle, Code, People } from 'iconsax-react';
import { FileTree } from './components/FileTree';

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => localStorage.getItem('ai_office_project_id') || null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'lobby' | '3d' | 'chat' | 'kanban' | 'workspace'>('3d');
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const data = await fetch('/api/projects').then(r => r.json());
      setProjects(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const {
    pipeline, kanban, chatLogs, workspaceFiles, absolutePath,
    currentStage, fsmState, decisionReq, aiStreamChunks, sendAction, stopAction
  } = usePipelineStream(currentProjectId);



  const handleProjectCreated = (id: string) => {
    setShowOnboarding(false);
    setCurrentProjectId(id);
    localStorage.setItem('ai_office_project_id', id);
    fetchProjects();
  };

  const handleSelectProject = (id: string | null) => {
    setCurrentProjectId(id);
    if (id) {
      localStorage.setItem('ai_office_project_id', id);
    } else {
      localStorage.removeItem('ai_office_project_id');
    }
  };

  const runningProject = projects.find(
    p => p.fsm_state && p.fsm_state.endsWith('_active') && !p.fsm_state.startsWith('paused_')
  );

  const handlePauseProject = async (projectId: string) => {
    try {
      await fetch(`/api/pipeline/${projectId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'pause', role: 'system' })
      });
      fetchProjects();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (currentProjectId === id) {
        setCurrentProjectId(null);
        localStorage.removeItem('ai_office_project_id');
      }
      fetchProjects();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={styles.appContainer}>
      <Sidebar 
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={(id) => {
          setShowSettings(false);
          handleSelectProject(id);
        }}
        onSettings={() => setShowSettings(true)}
        onDeleteProject={handleDeleteProject}
        onNewProject={() => {
          localStorage.removeItem('onboarding_messages');
          localStorage.removeItem('onboarding_reqs');
          setShowSettings(false);
          handleSelectProject(null);
          setShowOnboarding(true);
        }}
      />

      <div className={styles.mainContent}>
        {showSettings ? (
          <SettingsPage onBack={() => setShowSettings(false)} />
        ) : (!currentProjectId || showOnboarding) ? (
          runningProject ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              flex: 1, 
              padding: '40px',
              background: 'var(--bg-secondary)'
            }}>
              <div style={{
                background: '#fff',
                border: '4px solid #000',
                boxShadow: '8px 8px 0px 0px #000',
                padding: '40px',
                maxWidth: '600px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: '24px',
                  color: 'var(--accent-error)',
                  textTransform: 'uppercase',
                  margin: 0,
                  borderBottom: '4px solid #000',
                  paddingBottom: '16px'
                }}>
                  ⚠️ Proyek Sedang Berjalan
                </h2>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: '#000',
                  margin: 0
                }}>
                  Proyek <strong>{runningProject.name}</strong> saat ini sedang berjalan. Harap jeda (pause) proyek tersebut terlebih dahulu untuk dapat memulai proyek baru.
                </p>
                <div style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  marginTop: '12px' 
                }}>
                  <button
                    onClick={() => handlePauseProject(runningProject.id)}
                    style={{
                      flex: 1,
                      background: 'var(--accent-warning)',
                      color: '#000',
                      padding: '12px 16px',
                      border: '3px solid #000',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      boxShadow: '4px 4px 0px 0px #000',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    ⏸️ Jeda Proyek Aktif
                  </button>
                  <button
                    onClick={() => handleSelectProject(runningProject.id)}
                    style={{
                      flex: 1,
                      background: 'var(--accent-secondary)',
                      color: '#000',
                      padding: '12px 16px',
                      border: '3px solid #000',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      boxShadow: '4px 4px 0px 0px #000',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    Kembali ke Proyek
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <OnboardingChat 
              onClose={() => setShowOnboarding(false)}
              onProjectCreated={handleProjectCreated}
            />
          )
        ) : (
          <div className={styles.dashboardContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <PipelineStepper pipeline={pipeline} />
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {fsmState && fsmState.endsWith('_active') && !fsmState.startsWith('paused_') && (
                  <button 
                    onClick={() => sendAction('pause', 'system')}
                    style={{ 
                      background: 'var(--accent-warning)', color: '#000', padding: '8px 16px', border: '2px solid #000', 
                      cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', 
                      boxShadow: '2px 2px 0px 0px #000', height: 'fit-content'
                    }}
                  >
                    ⏸️ Jeda AI
                  </button>
                )}
                {fsmState && fsmState.startsWith('paused_') && (
                  <button 
                    onClick={() => sendAction('resume', 'system')}
                    style={{ 
                      background: 'var(--accent-success)', color: '#000', padding: '8px 16px', border: '2px solid #000', 
                      cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', 
                      boxShadow: '2px 2px 0px 0px #000', height: 'fit-content'
                    }}
                  >
                    ▶️ Lanjutkan AI
                  </button>
                )}
                {currentStage && currentStage !== 'done' && currentStage !== 'stopped' && (
                  <button 
                    onClick={stopAction}
                    style={{ 
                      background: 'var(--accent-error)', color: '#fff', padding: '8px 16px', border: '2px solid #000', 
                      cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase', 
                      boxShadow: '2px 2px 0px 0px #000', height: 'fit-content'
                    }}
                  >
                    🛑 Stop AI
                  </button>
                )}
                {currentStage === 'stopped' && (
                  <div style={{ color: 'var(--accent-error)', fontWeight: 900, textTransform: 'uppercase', padding: '8px' }}>
                    🛑 STOPPED
                  </div>
                )}
              </div>
            </div>
            
            {decisionReq && (
              <div className={styles.decisionBox}>
                <div className={styles.decisionIcon}><Warning2 size="24" color="#000" variant="Bold" /></div>
                <div className={styles.decisionContent}>
                  <div className={styles.decisionTitle}>Action Required</div>
                  <div className={styles.decisionPrompt}>{decisionReq.prompt}</div>
                </div>
                <div className={styles.decisionActions}>
                  {decisionReq.fsmState === 'qa_active' ? (
                    <>
                      <button className={`${styles.decisionBtn} ${styles.btnPass}`} onClick={() => sendAction('pass', 'qa')}><TickCircle size="18" variant="Bold"/> QA Pass</button>
                      <button className={`${styles.decisionBtn} ${styles.btnFail}`} onClick={() => sendAction('fail', 'qa')}><CloseCircle size="18" variant="Bold"/> QA Fail</button>
                    </>
                  ) : (
                    <>
                      <button className={`${styles.decisionBtn} ${styles.btnPass}`} onClick={() => sendAction('approve', 'pm')}><TickCircle size="18" variant="Bold"/> Approve</button>
                      <button className={`${styles.decisionBtn} ${styles.btnFail}`} onClick={() => sendAction('reject', 'pm')}><CloseCircle size="18" variant="Bold"/> Reject</button>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className={styles.tabContainer}>
              <div className={styles.tabBar}>
                <button 
                  className={`${styles.tabBtn} ${activeTab === 'lobby' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('lobby')}
                >
                  <People size="18" color="#000" variant="Bold" /> Lobby Proyek
                </button>
                <button 
                  className={`${styles.tabBtn} ${activeTab === '3d' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('3d')}
                >
                  <Building size="18" color="#000" variant="Bold" /> 3D Office
                </button>
                <button 
                  className={`${styles.tabBtn} ${activeTab === 'chat' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('chat')}
                >
                  <MessageText size="18" color="#000" variant="Bold" /> Chat Log
                </button>
                <button 
                  className={`${styles.tabBtn} ${activeTab === 'kanban' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('kanban')}
                >
                  <ClipboardTick size="18" color="#000" variant="Bold" /> Jira Board
                </button>
                <button 
                  className={`${styles.tabBtn} ${activeTab === 'workspace' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('workspace')}
                >
                  <Folder2 size="18" color="#000" variant="Bold" /> Workspace
                </button>
              </div>

              <div className={styles.tabContent}>
                 {activeTab === '3d' && (
                  <div className={`${styles.panel} ${styles.scenePanel}`}>
                    <div className={styles.panelBody} style={{ padding: 0, display: 'flex', flex: 1, flexDirection: 'column' }}>
                      <OfficeScene 
                        currentStage={currentStage} 
                        latestChat={chatLogs.filter(msg => msg.stage !== 'onboarding').slice(-1)[0]}
                      />
                    </div>
                  </div>
                )}

                 {activeTab === 'lobby' && (
                  <div className={`${styles.panel} ${styles.chatPanel}`}>
                    <div className={styles.panelBody}>
                      {chatLogs.filter(msg => msg.stage === 'onboarding').length === 0 ? (
                        <div style={{ color: '#000', fontWeight: 700, padding: '24px', textAlign: 'center' }}>
                          Belum ada riwayat onboarding (lobby proyek) untuk proyek ini.
                        </div>
                      ) : (
                        <ChatLog logs={chatLogs.filter(msg => msg.stage === 'onboarding')} aiStreamChunks={{}} />
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'chat' && (
                  <div className={`${styles.panel} ${styles.chatPanel}`}>
                    <div className={styles.panelBody}>
                      <ChatLog logs={chatLogs.filter(msg => msg.stage !== 'onboarding')} aiStreamChunks={aiStreamChunks} />
                    </div>
                  </div>
                )}

                {activeTab === 'kanban' && (
                  <div className={`${styles.panel} ${styles.kanbanPanel}`}>
                    <div className={styles.panelBody}>
                      <KanbanBoard kanban={kanban} />
                    </div>
                  </div>
                )}

                {activeTab === 'workspace' && (
                  <div className={`${styles.panel} ${styles.workspacePanel}`}>
                    <div className={styles.panelBody} style={previewFile ? { padding: 0 } : {}}>
                      {previewFile ? (
                        <MarkdownViewer 
                          url={`/workspace/${currentProjectId}/${encodeURIComponent(previewFile)}`} 
                          filename={previewFile}
                          onBack={() => setPreviewFile(null)}
                        />
                      ) : (
                        <>
                          {absolutePath && (
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                              <a 
                                href={`vscode://file/${absolutePath}`} 
                                className={styles.workspaceLink}
                                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'var(--accent-warning)', margin: 0 }}
                              >
                                <Code size="16" color="#000" variant="Bold" /> Open in VS Code
                              </a>
                              <a 
                                href={`cursor://file/${absolutePath}`} 
                                className={styles.workspaceLink}
                                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#3b82f6', color: '#fff', margin: 0 }}
                              >
                                <Code size="16" color="#fff" variant="Bold" /> Open in Cursor
                              </a>
                            </div>
                          )}
                          {workspaceFiles.length === 0 ? (
                            <div style={{color:'#000', fontSize:'14px', fontWeight: 700}}>No files yet...</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                              <div>
                                <h3 style={{ 
                                  fontFamily: 'var(--font-display)', 
                                  fontWeight: 900, 
                                  fontSize: '18px', 
                                  textTransform: 'uppercase',
                                  borderBottom: '2px solid #000',
                                  paddingBottom: '8px',
                                  marginBottom: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  color: '#000'
                                }}>
                                  <DocumentText size="20" color="#000" variant="Bold" /> Dokumen & Hasil Diskusi (.md)
                                </h3>
                                {workspaceFiles.filter(f => f.endsWith('.md')).length === 0 ? (
                                  <div style={{color:'#000', fontSize:'13px', fontStyle: 'italic'}}>Belum ada dokumen diskusi (.md).</div>
                                ) : (
                                  <ul style={{listStyle:'none', padding: 0}}>
                                    {workspaceFiles.filter(f => f.endsWith('.md')).map(f => (
                                      <li key={f} style={{marginBottom:'8px'}}>
                                        <a 
                                          href={`/workspace/${currentProjectId}/${encodeURIComponent(f)}`} 
                                          target="_blank" rel="noreferrer"
                                          className={styles.workspaceLink}
                                          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            setPreviewFile(f);
                                          }}
                                        >
                                          <DocumentText size="16" color="#000" variant="Bold" /> {f}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              <div>
                                <h3 style={{ 
                                  fontFamily: 'var(--font-display)', 
                                  fontWeight: 900, 
                                  fontSize: '18px', 
                                  textTransform: 'uppercase',
                                  borderBottom: '2px solid #000',
                                  paddingBottom: '8px',
                                  marginBottom: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  color: '#000'
                                }}>
                                  <Folder2 size="20" color="#000" variant="Bold" /> Source Code & Project Assets
                                </h3>
                                {workspaceFiles.filter(f => !f.endsWith('.md')).length === 0 ? (
                                  <div style={{color:'#000', fontSize:'13px', fontStyle: 'italic'}}>Belum ada file source code.</div>
                                ) : (
                                  <FileTree 
                                    files={workspaceFiles.filter(f => !f.endsWith('.md'))} 
                                    currentProjectId={currentProjectId!} 
                                    onPreviewMarkdown={setPreviewFile}
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
