// FSM state transitions
const TRANSITIONS = {
    idle:               { start:   'planning_active' },
    planning_active:    { ai_done: 'planning_pm_review', stop: 'stopped' },
    planning_pm_review: { approve: 'design_active', reject: 'idle' },
    design_active:      { ai_done: 'dev_active', stop: 'stopped' },
    dev_active:         { ai_done: 'qa_active', stop: 'stopped' },
    qa_active:          { pass:    'deploy_active',  fail:   'dev_active', stop: 'stopped' },
    deploy_active:      { ai_done: 'done', stop: 'stopped' },
    done:               {},
    stopped:            {}
};

// Which roles can fire which events (in which states)
const ROLE_PERMISSIONS = {
    pm:     { approve: true, reject: true },
    qa:     { pass: true, fail: true },
    system: { ai_done: true, start: true, stop: true }
};

// Map fsm_state → pipeline stage name (for UI)
const STAGE_OF = {
    idle:               null,
    planning_active:    'planning',
    planning_pm_review: 'planning',
    design_active:      'design',
    dev_active:         'dev',
    qa_active:          'qa',
    deploy_active:      'deploy',
    done:               'done',
    stopped:            'stopped'
};

// Map stage name → pipeline step index (1-5)
const STEP_OF = {
    planning: 1,
    design:   2,
    dev:      3,
    qa:       4,
    deploy:   5
};

function cleanState(fsmState) {
    if (!fsmState || typeof fsmState !== 'string') return '';
    return fsmState.replace(/^paused_/, '');
}

function isCustomState(fsmState) {
    return /^stage_\d+_(active|pm_review)$/.test(cleanState(fsmState));
}

function parseCustomState(fsmState) {
    const match = cleanState(fsmState).match(/^stage_(\d+)_(active|pm_review)$/);
    if (!match) return null;
    return {
        index: parseInt(match[1], 10),
        status: match[2]
    };
}

function getCustomTransition(currentState, event, stages = []) {
    if (currentState === 'idle' && event === 'start') {
        return 'stage_0_active';
    }
    const info = parseCustomState(currentState);
    if (!info) return null;

    const { index, status } = info;
    const N = stages.length;

    if (status === 'active') {
        if (event === 'stop') return 'stopped';
        if (event === 'ai_done') {
            const currentStageConfig = stages[index];
            const requiresReview = currentStageConfig && (currentStageConfig.requiresReview !== false);
            if (requiresReview) {
                return `stage_${index}_pm_review`;
            } else {
                if (index < N - 1) {
                    return `stage_${index + 1}_active`;
                } else {
                    return 'done';
                }
            }
        }
    } else if (status === 'pm_review') {
        if (event === 'approve') {
            if (index < N - 1) {
                return `stage_${index + 1}_active`;
            } else {
                return 'done';
            }
        }
        if (event === 'reject') {
            return `stage_${index}_active`;
        }
    }
    return null;
}

function transition(currentState, event, stages = []) {
    // Handle Pause/Resume dynamically
    if (event === 'pause') {
        const cleaned = cleanState(currentState);
        if ((cleaned.endsWith('_active') || isCustomState(cleaned)) && !currentState.startsWith('paused_')) {
            return 'paused_' + currentState;
        }
    }
    if (event === 'resume') {
        if (currentState.startsWith('paused_')) {
            return currentState.substring(7); // remove 'paused_' prefix
        }
    }

    const cleaned = cleanState(currentState);

    if (isCustomState(cleaned) || (cleaned === 'idle' && stages.length > 0 && !TRANSITIONS[cleaned])) {
        const next = getCustomTransition(cleaned, event, stages);
        if (!next) throw new Error(`Event '${event}' not valid in state '${currentState}' for custom template`);
        return next;
    }

    const available = TRANSITIONS[cleaned];
    if (!available) throw new Error(`Unknown state: ${currentState}`);
    const next = available[event];
    if (!next) throw new Error(`Event '${event}' not valid in state '${currentState}'`);
    return next;
}

function canFire(role, event, currentState, stages = []) {
    if (event === 'pause') {
        const cleaned = cleanState(currentState);
        return (cleaned.endsWith('_active') || isCustomState(cleaned)) && !currentState.startsWith('paused_') && currentState !== 'stopped' && currentState !== 'done' && currentState !== 'idle';
    }
    if (event === 'resume') {
        return currentState.startsWith('paused_');
    }

    // If currently paused, cannot fire any other event
    if (currentState.startsWith('paused_')) {
        return false;
    }

    if (isCustomState(currentState)) {
        const info = parseCustomState(currentState);
        if (!info) return false;
        
        // Custom review state requires approval or rejection from PM
        if (info.status === 'pm_review') {
            return role === 'pm' && (event === 'approve' || event === 'reject');
        }
        // Custom active state can be stopped by system
        if (info.status === 'active') {
            return role === 'system' && (event === 'ai_done' || event === 'stop');
        }
        return false;
    }

    const perms = ROLE_PERMISSIONS[role];
    if (!perms || !perms[event]) return false;
    const available = TRANSITIONS[currentState] || {};
    return !!available[event];
}

function isPmReviewState(state) {
    if (isCustomState(state)) {
        const info = parseCustomState(state);
        return info && info.status === 'pm_review';
    }
    return state && cleanState(state).includes('pm_review');
}

function isAiActiveState(state) {
    if (state.startsWith('paused_')) return false;
    if (isCustomState(state)) {
        const info = parseCustomState(state);
        return info && info.status === 'active';
    }
    return ['planning_active','design_active','dev_active','qa_active','deploy_active'].includes(state);
}

function stageOf(fsmState, stages = []) {
    const cleaned = cleanState(fsmState);
    if (isCustomState(cleaned)) {
        const info = parseCustomState(cleaned);
        if (info && stages[info.index]) {
            return stages[info.index].id;
        }
    }
    return STAGE_OF[cleaned] || null;
}

function stepOf(stage) {
    return STEP_OF[stage] || 0;
}

// Build pipeline array for frontend
function buildPipelineSteps(fsmState, stages = []) {
    const cleaned = cleanState(fsmState);
    if (isCustomState(cleaned) || cleaned === 'done' || cleaned === 'stopped') {
        if (stages.length > 0) {
            const info = parseCustomState(cleaned);
            const activeIndex = info ? info.index : (cleaned === 'done' ? stages.length : -1);

            return stages.map((s, i) => {
                let status = 'pending';
                if (i < activeIndex) status = 'completed';
                if (i === activeIndex) {
                    status = fsmState.startsWith('paused_') ? 'paused' : 'in-progress';
                }
                if (cleaned === 'done') status = 'completed';
                if (cleaned === 'stopped' && i >= activeIndex) status = 'stopped';
                return { id: i + 1, name: s.name, status };
            });
        }
    }

    const legacyStages = ['planning','design','dev','qa','deploy'];
    const activeStage = stageOf(fsmState);
    const activeStep = STEP_OF[activeStage] || 0;

    return legacyStages.map((name, i) => {
        const step = i + 1;
        let status = 'pending';
        if (step < activeStep) status = 'completed';
        if (step === activeStep) {
            status = fsmState.startsWith('paused_') ? 'paused' : 'in-progress';
        }
        if (cleaned === 'done') status = 'completed';
        if (cleaned === 'stopped') status = 'stopped';
        return { id: step, name: name.charAt(0).toUpperCase() + name.slice(1), status };
    });
}

module.exports = {
    transition, canFire, isPmReviewState, isAiActiveState,
    stageOf, stepOf, buildPipelineSteps, isCustomState, parseCustomState
};
