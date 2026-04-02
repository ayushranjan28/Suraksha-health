const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MediSafe API is running 🚀' });
});

module.exports = app;
