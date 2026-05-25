// SSE Broker — Map<projectId, Set<res>>
const clients = new Map();

function register(projectId, res) {
    res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
        'X-Accel-Buffering': 'no'
    });
    res.write(':ok\n\n');

    if (!clients.has(projectId)) clients.set(projectId, new Set());
    clients.get(projectId).add(res);

    return () => {
        clients.get(projectId)?.delete(res);
        if (clients.get(projectId)?.size === 0) clients.delete(projectId);
    };
}

function emit(projectId, event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.get(projectId)?.forEach(res => {
        try { res.write(payload); } catch {}
    });
}

// Heartbeat every 25s
setInterval(() => {
    clients.forEach(set => set.forEach(res => {
        try { res.write(':hb\n\n'); } catch {}
    }));
}, 25000);

module.exports = { register, emit };
