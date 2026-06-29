'use strict';

const express    = require('express');
const cors       = require('cors');
const cookieParser = require('cookie-parser');
const config     = require('./config');

const { apiLimiter }                  = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const authRoutes                      = require('./routes/auth');
const recordsRoutes                   = require('./routes/records');
const emergencyRoutes                 = require('./routes/emergency');
const patientProfileRoutes            = require('./routes/patientProfile');
const uploadRoutes                    = require('./routes/upload');
const delegatesRoutes                 = require('./routes/delegates');
const auditLogsRoutes                 = require('./routes/auditLogs');

const app = express();

// ── Security / transport middleware ───────────────────────
app.use(cors({
  origin:      config.corsOrigin,
  credentials: true,               // allow cookies to be sent cross-origin
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── Body / cookie parsers ─────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ── General rate limit (all /api routes) ─────────────────
app.use('/api', apiLimiter);

// ── Health-check routes (no auth required) ────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Suraksha Health API 🏥' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Suraksha Health API is running 🚀' });
});

// ── Feature routes ────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/patient-profile', patientProfileRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/delegates', delegatesRoutes);
app.use('/api/audit-logs', auditLogsRoutes);

// ── 404 & global error handler (must be last) ────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
