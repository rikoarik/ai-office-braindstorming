import React from 'react';
import styles from './Sidebar.module.css';
import { Setting2, Trash } from 'iconsax-react';

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
  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.title}>
          <Setting2 size="24" color="#000" variant="Bold" />
          AI Office
        </div>
      </div>
      
      <div className={styles.projectList}>
        {projects.map(p => (
          <div 
            key={p.id}
            className={`${styles.projectItem} ${p.id === currentProjectId ? styles.active : ''}`}
            onClick={() => onSelectProject(p.id)}
          >
            <div className={styles.projHeader}>
              <div className={styles.projName}>{p.name || 'Untitled'}</div>
              <button 
                className={styles.deleteBtn} 
                onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                title="Delete Project"
              >
                <Trash size="16" color="#000" variant="Bold" />
              </button>
            </div>
            <div className={styles.projTask}>{p.task || 'No description'}</div>
            <span className={styles.projState}>
              {p.fsm_state ? p.fsm_state.replace(/_/g, ' ') : 'idle'}
            </span>
          </div>
        ))}
        {projects.length === 0 && (
          <div style={{color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '20px'}}>
            No projects yet
          </div>
        )}
      </div>

      <div className={styles.footer} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button className={styles.newButton} onClick={onNewProject}>
          <div className={styles.newButtonInner} style={{ background: 'var(--accent-primary)', color: '#000' }}>
            + Proyek Baru
          </div>
        </button>
        <button className={styles.newButton} onClick={onSettings}>
          <div className={styles.newButtonInner}><Setting2 size="20" color="#fff" variant="Bold" /> Setting</div>
        </button>
      </div>
    </div>
  );
};
