const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

console.log('[BOOT] using file:', __filename);

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// health
app.get('/api/test', (_req, res) => res.json({ ok: true, msg: 'Backend running' }));

// routes
app.use('/api/stocks', require('./routes/stockRoutes'));
app.use('/api/news', require('./routes/newsRoutes'));
app.use('/api/ownership', require('./routes/ownershipRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));

// Force localhost:8081 so Windows PID 4 on 5000 can't block you
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 8081;

const server = app.listen(PORT, HOST, () => {
  console.log(`[LISTEN] http://${HOST}:${PORT}`);
});
server.on('error', (err) => {
  console.error('[ERROR] Failed to start server:', err);
  process.exit(1);
});
