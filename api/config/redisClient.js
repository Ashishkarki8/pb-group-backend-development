import { createClient } from 'redis';
import appConfig from './appConfig.js';

// 1️⃣ Create Redis client
const redisClient = createClient({
  url: appConfig.redisURL || 'redis://localhost:6379', // Use env variable
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis: Too many reconnection attempts. Giving up.');
        return new Error('Redis reconnection failed');
      }
      console.log(`🔄 Redis: Reconnecting... Attempt ${retries}`);
      return retries * 100; // Wait 100ms, 200ms, 300ms... between retries
    }
  }
});

// 2️⃣ Error handler
redisClient.on('error', (err) => {
  console.error('🔥 Redis Client Error:', err.message);
});

// 3️⃣ Connection success
redisClient.on('connect', () => {
  console.log('🟢 Redis: Connecting...');
});

redisClient.on('ready', () => {
  console.log('✅ Redis: Connected and ready!');
});

// 4️⃣ Disconnection handler
redisClient.on('end', () => {
  console.log('🔴 Redis: Disconnected');
});

// 5️⃣ Connect to Redis
await redisClient.connect();

export default redisClient;


