const express = require('express');
const router = express.Router();
const sse = require('../sse');

// GET /api/stream/:id
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const cleanup = sse.register(id, res);
    req.on('close', cleanup);
});

module.exports = router;
