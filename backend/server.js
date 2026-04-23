const config = require('./src/config');
const app = require('./src/app');
const { testConnection } = require('./src/config/db');
const emailService = require('./src/services/emailService');

const PORT = config.port;

async function start() {
  // Verify Supabase is reachable before accepting traffic
  const connected = await testConnection();
  if (!connected) {
    console.error('⚠️  Starting server anyway, but database is unreachable.');
  }

  // Verify Gmail SMTP connection
  await emailService.verifyTransporter();

  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`   Environment: ${config.nodeEnv}`);
  });
}

start();
