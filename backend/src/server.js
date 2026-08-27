const initialPort = process.env.PORT;
require('dotenv').config();
if (initialPort) {
  process.env.PORT = initialPort;
}

const express = require('express');
const cors = require('cors');
require('./store');
const { ensureSuperadmin } = require('./bootstrap');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || (origin && origin.includes('vercel.app'))) return callback(null, true);
      return callback(null, true);
    }
  })
);
app.use(express.json({ limit: '8mb' }));

let cloudSyncDone = false;
let cloudSyncPromise = null;

app.use(async (req, res, next) => {
  if (!cloudSyncDone && process.env.BLOB_READ_WRITE_TOKEN) {
    if (!cloudSyncPromise) {
      cloudSyncPromise = require('./store').syncFromCloud().catch(() => false);
    }
    await cloudSyncPromise;
    cloudSyncDone = true;
  }
  next();
});

app.get('/', (req, res) =>
  res.json({ status: 'ok', message: 'Agency CRM Backend API is running', timestamp: new Date().toISOString() })
);

app.get('/api', (req, res) =>
  res.json({ status: 'ok', message: 'Agency CRM Backend API is running', timestamp: new Date().toISOString() })
);

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() })
);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/content', require('./routes/content'));
app.use('/api/team', require('./routes/team'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/emails', require('./routes/emails'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/invites', require('./routes/invites'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

ensureSuperadmin().catch((err) => console.error('Owner bootstrap failed:', err.message));

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    try {
      require('./jobs/reminders').startReminderJob();
    } catch (e) {}
  });
}

module.exports = app;
