import React, { useState, useEffect, useRef } from 'react';
import styles from './OnboardingChat.module.css';
import { People, User, Cpu, DocumentUpload, Global } from 'iconsax-react';
import { ChatMessageMarkdown } from './ChatMessageMarkdown';

interface Message {
  role: 'user' | 'assistant' | 'ai';
  content: string;
}

interface OnboardingChatProps {
  onClose: () => void;
  onProjectCreated: (projectId: string) => void;
}

export const OnboardingChat: React.FC<OnboardingChatProps> = ({ onProjectCreated }) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('onboarding_messages');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [importPath, setImportPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedReqs, setExtractedReqs] = useState<any>(() => {
    const saved = localStorage.getItem('onboarding_reqs');
    return saved ? JSON.parse(saved) : null;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [chatFlex, setChatFlex] = useState(65);
  const [isDragging, setIsDragging] = useState(false);
  const resizerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    if (resizerRef.current) {
      resizerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const container = document.getElementById('onboarding-body-layout');
    if (container) {
      const rect = container.getBoundingClientRect();
      const newFlex = ((e.clientX - rect.left) / rect.width) * 100;
      if (newFlex > 20 && newFlex < 80) {
        setChatFlex(newFlex);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (resizerRef.current && resizerRef.current.hasPointerCapture(e.pointerId)) {
      resizerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const [activeConfig, setActiveConfig] = useState<any>(null);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; content: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStopSend = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages(prev => {
      if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && !prev[prev.length - 1].content) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setAttachedFiles(prev => [...prev, { name: file.name, content }]);
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  const handleAttachUrl = async () => {
    const url = prompt('Masukkan URL website/internet (contoh: https://example.com/paper):');
    if (!url) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/scrape?url=${encodeURIComponent(url)}`).then(r => r.json());
      if (res.error) throw new Error(res.error);
      setAttachedFiles(prev => [...prev, { name: `URL: ${url}`, content: res.text }]);
    } catch (err: any) {
      alert(`Gagal mengambil konten dari URL: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await fetch('/api/settings').then(r => r.json());
        setActiveConfig(config);
      } catch (e) {
        console.error(e);
        setActiveConfig({ template: 'software_dev' });
      }
    };
    fetchConfig();
  }, []);

  // Initial greeting
  useEffect(() => {
    if (activeConfig && messages.length === 0) {
      let greeting = "**Alice (PM):** Welcome to the Pre-Production Lobby! ✦ I've gathered the whole committee here (Architect, Designer, Devs, and QA). Pitch us your idea, and let's brainstorm together!";
      
      const templateId = activeConfig.template;
      if (templateId === 'academic_thesis') {
        greeting = "**Alice (Pembimbing):** Selamat datang di Ruang Bimbingan & Proposal! 🎓 Saya telah mengumpulkan tim komite akademik (Bob - Peneliti Metode, Eve - Desainer Visual, Charlie - Penulis Akademik, dan Sam - Proofreader). Silakan sampaikan ide penelitian skripsi atau topik yang ingin Anda angkat, dan mari kita mulai diskusikan!";
      } else if (templateId === 'marketing_agency') {
        greeting = "**Alice (Strategist):** Selamat datang di Lobby Perencanaan Campaign! 📢 Tim kami (Creative Director, Copywriter, Content Producer, Brand Reviewer, dan Campaign Manager) siap membantu merancang kampanye pemasaran Anda. Silakan sampaikan brief ide Anda!";
      } else if (templateId === 'design_studio') {
        greeting = "**Alice (Art Director):** Selamat datang di Studio Desain! 🎨 Tim desainer kami (Researcher, Visual Designer, Production Designer, dan Design Lead) siap merealisasikan konsep visual Anda. Beritahu kami kebutuhan desain Anda!";
      } else if (templateId === 'content_factory') {
        greeting = "**Alice (Strategist):** Selamat datang di Lobby Produksi Konten! 📝 Tim redaksi kami (Senior Editor, Writer, SEO Specialist, dan Editor-in-Chief) siap membuat konten berkualitas tinggi untuk Anda. Beritahu kami topik artikel atau blog yang ingin dibuat!";
      } else if (templateId === 'video_production') {
        greeting = "**Alice (Producer):** Selamat datang di Lobby Produksi Video! 🎬 Tim kami (Screenwriter, Storyboard Artist, Production Manager, dan Editor) siap mewujudkan ide video Anda. Silakan ceritakan konsep video yang ingin Anda produksi!";
      } else if (templateId && templateId.startsWith('custom_')) {
        const roles = activeConfig.stages ? activeConfig.stages.map((s: any) => s.role).filter(Boolean) : [];
        const rolesList = roles.length > 0 ? ` (${roles.join(', ')})` : '';
        greeting = `**Alice (PM):** Selamat datang di Lobby Proyek Kustom Anda! ✦ Saya telah mengumpulkan tim komite kustom kami${rolesList}. Silakan sampaikan ide proyek Anda untuk kita diskusikan bersama!`;
      }
      
      const timer = setTimeout(() => {
        setMessages([{ role: 'assistant', content: greeting }]);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [activeConfig, messages.length]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('onboarding_messages', JSON.stringify(messages));
    } else {
      localStorage.removeItem('onboarding_messages');
    }
  }, [messages]);

  useEffect(() => {
    if (extractedReqs) {
      localStorage.setItem('onboarding_reqs', JSON.stringify(extractedReqs));
    } else {
      localStorage.removeItem('onboarding_reqs');
    }
  }, [extractedReqs]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, extractedReqs]);

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;
    
    let displayPrompt = input.trim();
    let apiPrompt = input.trim();
    if (attachedFiles.length > 0) {
      displayPrompt += '\n\n**📎 Lampiran:**\n' + attachedFiles.map(f => `- ${f.name}`).join('\n');
      apiPrompt += '\n\n**[Attached Files/URLs Content]**';
      attachedFiles.forEach(f => {
        apiPrompt += `\n\n<ATTACHMENT name="${f.name}">\n${f.content}\n</ATTACHMENT>`;
      });
    }

    const userMsg = { role: 'user' as const, content: displayPrompt };
    const newMessages = [...messages, userMsg];
    const apiMessages = [...messages, { role: 'user' as const, content: apiPrompt }];

    setMessages(newMessages);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setMessages([...newMessages, { role: 'assistant', content: '' }]);

      const res = await fetch('/api/projects/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let fullReply = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);
          if (raw === '[DONE]') break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.chunk) {
              fullReply += parsed.chunk;
              const visible = fullReply.replace(/<REQUIREMENTS>[\s\S]*?<\/REQUIREMENTS>/g, '').trim();
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: visible || '...' };
                return updated;
              });
            }
            if (parsed.requirements) {
              setExtractedReqs(parsed.requirements);
            }
          } catch (e) {}
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted by user.');
      } else {
        console.error(err);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStart = async () => {
    if (!extractedReqs) return;
    const taskStr = [
      extractedReqs.task,
      extractedReqs.features?.length ? `Features: ${extractedReqs.features.join(', ')}` : '',
      extractedReqs.techStack?.length ? `Tech stack: ${extractedReqs.techStack.join(', ')}` : '',
      extractedReqs.targetUsers ? `Target users: ${extractedReqs.targetUsers}` : '',
      extractedReqs.constraints ? `Constraints: ${extractedReqs.constraints}` : ''
    ].filter(Boolean).join('. ');

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: extractedReqs.name || 'MyProject', 
          task: taskStr,
          features: extractedReqs.features || [],
          importPath: importPath.trim() || undefined,
          onboardMessages: messages
        })
      });
      const data = await res.json();
      localStorage.removeItem('onboarding_messages');
      localStorage.removeItem('onboarding_reqs');
      onProjectCreated(data.projectId);
    } catch (err) {
      alert('Failed to start project');
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the conversation?')) {
      setMessages([]);
      setExtractedReqs(null);
      setImportPath('');
      localStorage.removeItem('onboarding_messages');
      localStorage.removeItem('onboarding_reqs');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.avatar}>
            <People size="32" color="#000" variant="Bold" />
          </div>
          <div className={styles.info} style={{ flex: 1 }}>
            <div className={styles.title}>Project Lobby</div>
            <div className={styles.sub}>AI Factory Committee</div>
          </div>
          <button 
            className={styles.closeButton} 
            onClick={handleReset}
          >
            Reset Chat
          </button>
        </div>

        <div className={styles.bodyLayout} id="onboarding-body-layout">
          <div className={styles.chatSection} style={{ flex: extractedReqs ? `0 0 ${chatFlex}%` : 1 }}>
            <div className={styles.messages}>
              {messages.map((m, i) => (
                <div key={i} className={`${styles.msg} ${m.role === 'user' ? styles.msgUser : styles.msgAi}`}>
                  <div className={styles.av}>
                    {m.role === 'user' ? <User size="24" color="#000" variant="Bold" /> : <Cpu size="24" color="#000" variant="Bold" />}
                  </div>
                  <div className={styles.bubble}>
                    {m.content ? (
                      <ChatMessageMarkdown content={m.content} compact />
                    ) : (
                      <div className={styles.typingIndicator}>
                        <span></span><span></span><span></span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputRow}>
              <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
              />

              {attachedFiles.length > 0 && (
                <div className={styles.attachmentList}>
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className={styles.attachmentPill}>
                      <span>{file.name.length > 30 ? file.name.substring(0, 27) + '...' : file.name}</span>
                      <button 
                        className={styles.removeAttachment} 
                        onClick={() => removeAttachment(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.inputArea}>
                <textarea 
                  className={styles.textarea}
                  placeholder="Ketik ide Anda atau jelaskan berkas terlampir (Tekan Enter untuk mengirim, Shift+Enter untuk baris baru)..." 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  autoFocus
                />
                
                <div className={styles.actionButtons}>
                  <button 
                    className={styles.actionBtn} 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    title="Upload file teks (.txt, .md, .js, .json, dll.)"
                  >
                    <DocumentUpload size="16" color="#000" variant="Bold" /> File
                  </button>
                  <button 
                    className={styles.actionBtn} 
                    onClick={handleAttachUrl}
                    disabled={isLoading}
                    title="Masukkan URL website untuk di-scrape"
                  >
                    <Global size="16" color="#000" variant="Bold" /> URL Web
                  </button>
                </div>

                {isLoading ? (
                  <button 
                    className={styles.stopBtn} 
                    onClick={handleStopSend}
                  >
                    Stop
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button 
                      className={styles.sendBtn} 
                      onClick={handleSend} 
                      disabled={!input.trim() && attachedFiles.length === 0}
                      style={{ flex: 1 }}
                    >
                      Send
                    </button>
                    {input.trim() && (
                      <button 
                        className={styles.clearBtn} 
                        onClick={() => setInput('')}
                        title="Batal mengetik"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {extractedReqs && (
            <div 
              ref={resizerRef}
              className={`${styles.resizer} ${isDragging ? styles.resizerActive : ''}`} 
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          )}

          {extractedReqs && (
            <div className={styles.reqSection}>
              <div className={styles.reqBox}>
                <h4>✦ Requirements Extracted</h4>
                <div className={styles.reqRow}><b>Project:</b> <span>{extractedReqs.name}</span></div>
                <div className={styles.reqRow}><b>Goal:</b> <span>{extractedReqs.task}</span></div>
                {extractedReqs.targetUsers && <div className={styles.reqRow}><b>Users:</b> <span>{extractedReqs.targetUsers}</span></div>}
                {extractedReqs.techStack?.length > 0 && <div className={styles.reqRow}><b>Stack:</b> <span>{extractedReqs.techStack.join(', ')}</span></div>}
                {extractedReqs.features?.length > 0 && <div className={styles.reqRow}><b>Features:</b> <span>{extractedReqs.features.join(', ')}</span></div>}
              </div>
              
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 900, fontSize: '14px', textTransform: 'uppercase' }}>Import Local Path (Opsional)</label>
                <input 
                  type="text" 
                  placeholder="/Users/macbook/path/to/project"
                  value={importPath}
                  onChange={(e) => setImportPath(e.target.value)}
                  style={{
                    padding: '12px',
                    border: '2px solid #000',
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button className={styles.startBtn} onClick={handleStart} style={{ marginTop: '24px' }}>
                Initialize Project Space ✦
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
