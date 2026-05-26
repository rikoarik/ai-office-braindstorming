import React, { useState } from 'react';
import styles from './Sidebar.module.css';
import { Setting2, Trash, HambergerMenu, Add } from 'iconsax-react';

export interface Project {
  id: string;
  name: string;
  task: string;
  fsm_state?: string;
}

interface SidebarProps {
  projects: Project[];
  currentProjectId: string | null;
  onSelectProject: (id: string) => void;
  onSettings: () => void;
  onDeleteProject: (id: string) => void;
  onNewProject: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  currentProjectId,
  onSelectProject,
  onSettings,
  onDeleteProject,
  onNewProject
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        {!isCollapsed && (
          <div className={styles.title}>
            <Setting2 size="24" color="#000" variant="Bold" />
            AI Office
          </div>
        )}
        <button 
          className={styles.toggleBtn} 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <HambergerMenu size="20" color="#000" variant="Outline" />
        </button>
      </div>
      
      <div className={styles.projectList}>
        {projects.map(p => (
          <div 
            key={p.id}
            className={`${styles.projectItem} ${p.id === currentProjectId ? styles.active : ''}`}
            onClick={() => onSelectProject(p.id)}
            title={isCollapsed ? (p.name || 'Untitled') : undefined}
          >
            <div className={styles.projHeader}>
              <div className={styles.projName}>
                {isCollapsed ? (p.name || 'U').substring(0, 2).toUpperCase() : (p.name || 'Untitled')}
              </div>
              {!isCollapsed && (
                <button 
                  className={styles.deleteBtn} 
                  onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                  title="Delete Project"
                >
                  <Trash size="16" color="#000" variant="Bold" />
                </button>
              )}
            </div>
            {!isCollapsed && (
              <>
                <div className={styles.projTask}>{p.task || 'No description'}</div>
                <span className={styles.projState}>
                  {p.fsm_state ? p.fsm_state.replace(/_/g, ' ') : 'idle'}
                </span>
              </>
            )}
          </div>
        ))}
        {projects.length === 0 && !isCollapsed && (
          <div style={{color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '20px'}}>
            No projects yet
          </div>
        )}
      </div>

      <div className={styles.footer} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button className={styles.newButton} onClick={onNewProject} title="Proyek Baru">
          <div className={styles.newButtonInner} style={{ background: 'var(--accent-primary)', color: '#000' }}>
            {isCollapsed ? <Add size="24" color="#000" variant="Bold" /> : '+ Proyek Baru'}
          </div>
        </button>
        <button className={styles.newButton} onClick={onSettings} title="Settings">
          <div className={styles.newButtonInner}>
            <Setting2 size={isCollapsed ? "24" : "20"} color="#fff" variant="Bold" /> 
            {!isCollapsed && 'Setting'}
          </div>
        </button>
      </div>
    </div>
  );
};
