import { useState, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../components/ChatLog';
import type { KanbanTask } from '../components/KanbanBoard';

export function usePipelineStream(projectId: string | null) {
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [kanban, setKanban] = useState<KanbanTask[]>([]);
  const [chatLogs, setChatLogs] = useState<ChatMessage[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
  const [absolutePath, setAbsolutePath] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [fsmState, setFsmState] = useState<string | null>(null);
  
  const [aiStreamChunks, setAiStreamChunks] = useState<Record<string, string>>({});
  
  const [decisionReq, setDecisionReq] = useState<any>(null);

  // When project changes, fetch initial state
  useEffect(() => {
    if (!projectId) {
      setPipeline([]); setKanban([]); setChatLogs([]); setWorkspaceFiles([]); setAbsolutePath(null);
      setCurrentStage(null); setFsmState(null); setDecisionReq(null); setAiStreamChunks({});
      return;
    }

    const loadProject = async () => {
      try {
        const data = await fetch(`/api/projects/${projectId}`).then(r => r.json());
        setPipeline(data.pipeline || []);
        setKanban(data.state?.kanban || []);
        setWorkspaceFiles(data.files || []);
        setChatLogs(data.chatLog || []);
        setAbsolutePath(data.absolutePath || null);
        setFsmState(data.state?.fsm_state || null);
        
        const stage = data.state?.fsm_state ? data.state.fsm_state.replace('_active','').replace('_pm_review','') : null;
        setCurrentStage(stage);

        if (data.state?.fsm_state?.includes('pm_review')) {
          setDecisionReq({ role: 'pm', fsmState: data.state.fsm_state, prompt: 'Pending review — Approve or Reject?' });
        } else {
          setDecisionReq(null);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadProject();
  }, [projectId]);

  // Handle SSE
  useEffect(() => {
    if (!projectId) return;

    const source = new EventSource(`/api/stream/${projectId}`);

    source.addEventListener('chat_message', (e) => {
      const msg = JSON.parse(e.data);
      setChatLogs(prev => [...prev, msg]);
    });

    source.addEventListener('ai_chunk', (e) => {
      const { chunk, stage } = JSON.parse(e.data);
      setAiStreamChunks(prev => ({
        ...prev,
        [stage]: (prev[stage] || '') + chunk
      }));
    });

    source.addEventListener('pipeline_update', (e) => {
      setAiStreamChunks({}); // Clear streaming text on stage change
      const data = JSON.parse(e.data);
      setFsmState(data.fsmState);
      setPipeline(data.pipeline || []);
      setKanban(data.kanban || []);
      setCurrentStage(data.stage);
    });

    source.addEventListener('workspace_update', (e) => {
      const { files } = JSON.parse(e.data);
      setWorkspaceFiles(files || []);
    });

    source.addEventListener('decision_required', (e) => {
      setDecisionReq(JSON.parse(e.data));
    });

    return () => {
      source.close();
    };
  }, [projectId]);

  const sendAction = useCallback(async (event: string, role: string) => {
    if (!projectId) return;
    setDecisionReq(null);
    await fetch(`/api/pipeline/${projectId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, role })
    });
  }, [projectId]);

  const stopAction = useCallback(async () => {
    if (!projectId) return;
    await fetch(`/api/pipeline/${projectId}/stop`, {
      method: 'POST'
    });
  }, [projectId]);

  return {
    pipeline, kanban, chatLogs, workspaceFiles, absolutePath,
    currentStage, fsmState, decisionReq, 
    aiStreamChunks, sendAction, stopAction
  };
}

