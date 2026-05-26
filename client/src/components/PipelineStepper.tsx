import React from 'react';
import styles from './PipelineStepper.module.css';

interface Stage {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'paused' | 'completed' | 'stopped';
}

interface PipelineStepperProps {
  pipeline: Stage[];
}

export const PipelineStepper: React.FC<PipelineStepperProps> = ({ pipeline }) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {pipeline.map((stage) => (
          <div
            key={stage.id}
            className={`${styles.stage} ${
              stage.status === 'in-progress' ? styles.inProgress : ''
            } ${stage.status === 'paused' ? styles.paused : ''} ${
              stage.status === 'completed' ? styles.completed : ''
            }`}
          >
            {stage.name}
          </div>
        ))}
        {pipeline.length === 0 && (
          <div style={{color: 'var(--text-muted)', fontSize: '13px', padding: '12px'}}>
            Pipeline not started
          </div>
        )}
      </div>
    </div>
  );
};
