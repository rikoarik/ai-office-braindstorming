import React from 'react';
import styles from './KanbanBoard.module.css';

export interface KanbanTask {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
}

interface KanbanBoardProps {
  kanban: KanbanTask[];
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ kanban }) => {
  const todo = kanban.filter(t => t.status === 'todo');
  const inProgress = kanban.filter(t => t.status === 'in-progress');
  const done = kanban.filter(t => t.status === 'done');

  const renderCol = (title: string, tasks: KanbanTask[]) => (
    <div className={styles.col}>
      <h4 className={styles.colTitle}>{title}</h4>
      <div className={styles.taskList}>
        {tasks.map(t => (
          <div key={t.id} className={`${styles.task} ${t.status === 'in-progress' ? styles.inProgress : ''} ${t.status === 'done' ? styles.done : ''}`}>
            {t.title}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.cols}>
      {renderCol('To Do', todo)}
      {renderCol('Doing', inProgress)}
      {renderCol('Done', done)}
    </div>
  );
};
