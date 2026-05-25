import React, { useEffect, useRef } from 'react';
import styles from './ChatLog.module.css';
import { User, ShieldTick, Magicpen, Code, Code1, TickSquare, Flash, Cpu, Setting2, MessageText } from 'iconsax-react';
import { ChatMessageMarkdown } from './ChatMessageMarkdown';

export interface ChatMessage {
  id: string;
  role: string;
  message: string;
  ts: number;
  stage?: string;
}

interface ChatLogProps {
  logs: ChatMessage[];
  aiStreamChunks: Record<string, string>;
}

const ROLE_ICONS: Record<string, React.ReactNode> = { 
  user: <User size="20" color="#000" variant="Bold" />,
  assistant: <Cpu size="20" color="#000" variant="Bold" />,
  pm: <User size="20" color="#000" variant="Bold" />, 
  architect: <ShieldTick size="20" color="#000" variant="Bold" />, 
  designer: <Magicpen size="20" color="#000" variant="Bold" />, 
  dev1: <Code size="20" color="#000" variant="Bold" />, 
  dev2: <Code1 size="20" color="#000" variant="Bold" />, 
  qa: <TickSquare size="20" color="#000" variant="Bold" />, 
  devops: <Flash size="20" color="#000" variant="Bold" />, 
  ai: <Cpu size="20" color="#000" variant="Bold" />, 
  system: <Setting2 size="20" color="#000" variant="Bold" />, 
  frontend: <Code size="20" color="#000" variant="Bold" />, 
  backend: <Code1 size="20" color="#000" variant="Bold" /> 
};
const ROLE_NAMES: Record<string, string> = { user: 'User', assistant: 'Lobby Agent', pm:'Alice (PM)', architect:'Bob (Arch)', designer:'Eve (Design)', dev1:'Charlie (Dev)', dev2:'Dave (Dev)', qa:'Sam (QA)', devops:'Ivy (Ops)', ai:'AI', system:'System', frontend:'Frontend Agent', backend:'Backend Agent' };

export const ChatLog: React.FC<ChatLogProps> = ({ logs, aiStreamChunks }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, aiStreamChunks]);

  return (
    <div className={styles.log}>
      {logs.map((msg) => (
        <div key={msg.id} className={styles.entry}>
          <div className={styles.icon}>{ROLE_ICONS[msg.role] || <MessageText size="20" color="#000" variant="Bold" />}</div>
          <div className={styles.meta}>
            <div className={styles.header}>
              <span className={`${styles.sender} ${styles[`role_${msg.role}`] || ''}`}>
                {ROLE_NAMES[msg.role] || msg.role}
              </span>
              <span className={styles.ts}>
                {new Date(msg.ts).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
              </span>
            </div>
            <div className={styles.msg}><ChatMessageMarkdown content={msg.message} /></div>
          </div>
        </div>
      ))}
      
      {Object.entries(aiStreamChunks).map(([stage, chunk]) => {
        if (!chunk) return null;
        return (
          <div key={`stream-${stage}`} className={`${styles.entry} ${styles.aiStream}`}>
            <div className={styles.icon}><Cpu size="20" color="#000" variant="Bold" /></div>
            <div className={styles.meta}>
              <div className={styles.header}>
                <span className={`${styles.sender} ${styles.role_ai}`}>
                  AI ({stage})
                </span>
              </div>
              <div className={styles.msg}><ChatMessageMarkdown content={chunk} compact /></div>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
};

