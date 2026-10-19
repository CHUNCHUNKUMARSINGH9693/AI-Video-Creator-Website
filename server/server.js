const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const db = require('./config/database');
const storage = require('./services/storageService');
const initDatabase = require('./scripts/init-db');

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  console.log('----------------------------------------------------');
  console.log('       AI Video Creator SaaS - Server Starting      ');
  console.log('----------------------------------------------------');

  // Ensure upload folders exist
  storage.initDirectories();

  // Test and initialize MySQL connection
  try {
    const connected = await db.testConnection();
    if (connected) {
      console.log('[Server] Checking and applying database migrations...');
      await initDatabase();
    } else {
      console.warn('[Server] Notice: Running with pending database connection.');
      console.warn('[Server] Update MYSQL_PASSWORD in .env anytime to connect to MySQL.');
    }
  } catch (err) {
    console.warn('[Server] DB initialization warning:', err.message);
  }

  // Periodic temp directory cleanup every 4 hours
  setInterval(() => {
    storage.cleanTempDirectory(4);
  }, 4 * 60 * 60 * 1000);

  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 AI Video Creator API Server running on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📁 Local Storage: ${storage.DIRECTORIES.root}`);
    console.log(`⚙️  Active AI Provider: ${process.env.AI_VIDEO_PROVIDER || 'demo'}\n`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Server] Shutting down gracefully...');
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
