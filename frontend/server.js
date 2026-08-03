const express = require('express');
const path = require('path');
const helmet = require('helmet');
const app = express();
const port = 3000;

app.use(helmet({ crossOriginEmbedderPolicy: true }));
app.disable('x-powered-by');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', service: 'frontend' });
});

app.listen(port, () => {
    console.log(`Frontend app listening on port ${port}`);
});
