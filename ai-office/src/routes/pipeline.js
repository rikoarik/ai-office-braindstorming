const express = require('express');
const router = express.Router();
const db = require('../db');
const sse = require('../sse');
const sm = require('../stateMachine');
const aiWorker = require('../aiWorker');

// POST /api/pipeline/:id/action
router.post('/:id/action', (req, res) => {
    const { id } = req.params;
    const { event, role } = req.body;

    if (!event || !role) return res.status(400).json({ error: 'event and role required' });

    const state = db.getPipelineState(id);
    if (!state) return res.status(404).json({ error: 'Project not found' });

    const stages = db.getProjectStages(id);

    // Validate permission
    if (!sm.canFire(role, event, state.fsm_state, stages)) {
        return res.status(403).json({ error: `Role '${role}' cannot fire '${event}' in state '${state.fsm_state}'` });
    }

    // Transition
    let newState;
    try {
        newState = sm.transition(state.fsm_state, event, stages);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }

    db.updateFsmState(id, newState);

    if (event === 'pause') {
        aiWorker.stopStage(id);
    }

    const pipeline = sm.buildPipelineSteps(newState, stages);
    const stage = sm.stageOf(newState, stages);

    // Insert action chat message
    const actionMsgs = {
        approve: '✓ Approved! Moving to next stage.',
        reject:  '✗ Rejected. Sending back for revision.',
        pass:    '✓ QA Passed! Proceeding to deployment.',
        fail:    '✗ QA Failed! Sending back to Development.',
        pause:   '⏸️ AI Paused.',
        resume:  '▶️ AI Resumed.'
    };
    const chatId = db.insertChat(id, role, actionMsgs[event] || event, stage);
    sse.emit(id, 'chat_message', { id: chatId, ts: Date.now(), role, message: actionMsgs[event], stage });
    sse.emit(id, 'pipeline_update', { fsmState: newState, stage, kanban: db.getPipelineState(id).kanban, pipeline });

    res.json({ ok: true, newState, stage, pipeline });

    // Trigger AI for active stages
    if (sm.isCustomState(newState)) {
        const info = sm.parseCustomState(newState);
        if (info && info.status === 'active') {
            setImmediate(() => aiWorker.runStage(id, stages[info.index].id));
        }
    } else {
        const stageMap = {
            planning_active: 'planning',
            design_active:  'design',
            dev_active:     'dev',
            qa_active:      'qa',
            deploy_active:  'deploy'
        };
        if (stageMap[newState]) {
            setImmediate(() => aiWorker.runStage(id, stageMap[newState]));
        }
    }
});

// POST /api/pipeline/:id/stop
router.post('/:id/stop', (req, res) => {
    const { id } = req.params;
    const state = db.getPipelineState(id);
    if (!state) return res.status(404).json({ error: 'Project not found' });

    aiWorker.stopStage(id);

    const stages = db.getProjectStages(id);
    try {
        const newState = sm.transition(state.fsm_state, 'stop', stages);
        db.updateFsmState(id, newState);
        const pipeline = sm.buildPipelineSteps(newState, stages);
        sse.emit(id, 'pipeline_update', { fsmState: newState, stage: 'stopped', kanban: state.kanban, pipeline });
        res.json({ ok: true, newState });
    } catch (err) {
        // if transition is invalid, we still aborted the worker at least
        res.json({ ok: true, aborted: true });
    }
});

module.exports = router;
