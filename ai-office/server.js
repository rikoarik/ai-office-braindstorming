require('dotenv').config();
const express = require('express');
const path = require('path');
const { initDb } = require('./src/db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/projects',  require('./src/routes/projects'));
app.use('/api/pipeline',  require('./src/routes/pipeline'));
app.use('/api/stream',    require('./src/routes/stream'));
app.use('/api/settings',  require('./src/routes/settings'));

// Serve workspace files per project
app.use('/workspace/:projectId', (req, res, next) => {
    express.static(path.join(__dirname, 'workspace', req.params.projectId))(req, res, next);
});

initDb();

app.listen(3000, () => console.log('AI Factory running → http://localhost:3000'));
