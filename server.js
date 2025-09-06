
// server.scaffold.js — Railway-ready baseline
// Minimal, robust Express + Mongoose app with health checks and safe startup.

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// --- Constants & Config
const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// --- Simple routes
app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

app.get('/api/test', (_req, res) => {
  res.status(200).json({ status: 'ok', ts: new Date().toISOString() });
});

app.get('/api/test/test-mongo', async (_req, res) => {
  try {
    const state = mongoose.connection.readyState; // 1 = connected
    if (state === 1) return res.status(200).json({ mongo: 'ok' });
    return res.status(503).json({ mongo: 'not_connected', state });
  } catch (e) {
    return res.status(500).json({ mongo: 'error', error: String(e) });
  }
});

// --- Mongo connect with retry/backoff
const MAX_RETRIES = 12;
const BASE_DELAY_MS = 1000;

async function connectMongoWithRetry(attempt = 1) {
  if (!MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI is not set — skipping DB connect.');
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
    });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error(`❌ MongoDB connect failed (attempt ${attempt}/${MAX_RETRIES}):`, err.message);
    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.min(8, attempt); // linear-ish backoff
      console.log(`⏳ Retrying in ${delay}ms ...`);
      await new Promise(r => setTimeout(r, delay));
      return connectMongoWithRetry(attempt + 1);
    } else {
      console.error('🛑 Reached max retry attempts. Continuing without DB.');
    }
  }
}

// --- Start server immediately to satisfy platform health checks
const server = app.listen(PORT, HOST, () => {
  console.log(`✅ Server listening on http://${HOST}:${PORT}`);
  if (!MONGODB_URI) {
    console.log('ℹ️  No MONGODB_URI provided. /api/test works; /api/test/test-mongo will be unavailable.');
  }
  // Start async DB connect in background
  connectMongoWithRetry().catch(err => console.error('Top-level mongo error:', err));
});

// --- Graceful shutdown
function shutdown(reason) {
  console.log(`
🔻 Shutting down (${reason}) ...`);
  server.close(() => {
    console.log('HTTP server closed.');
    mongoose.connection.close(false).then(() => {
      console.log('Mongo connection closed.');
      process.exit(0);
    }).catch(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  // Do not crash; keep serving /healthz to pass platform checks
});
