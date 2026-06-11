const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', service: 'frontend' });
});

app.listen(port, () => {
    console.log(`Frontend app listening on port ${port}`);
});
