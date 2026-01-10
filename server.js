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

const server = app.listen(appConfig.serverPort, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Server running on port ${appConfig.serverPort}`);
  console.log(`📍 Environment: ${appConfig.nodeEnv}`);
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
  });
});
