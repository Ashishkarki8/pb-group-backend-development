/**
 * ============================================================
 * Server Entry Point
 * ============================================================
 * Responsible only for:
 * - Starting the HTTP server
 * - Handling process lifecycle events
 * ============================================================
 */

import app from './index.js';
import appConfig from './api/config/appConfig.js';
import redisClient from './api/config/redisClient.js';

const server = app.listen(appConfig.serverPort, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${appConfig.serverPort}`);
  console.log(`📍 Environment: ${appConfig.nodeEnv}`);
  console.log('='.repeat(50));
});


// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await redisClient.quit();  // Close Redis connection
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received. Closing Redis...');
  await redisClient.quit();

  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
