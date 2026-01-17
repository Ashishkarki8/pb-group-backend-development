// import { createClient } from 'redis';

// async function testRedis() {
//   const redisClient = createClient({
//     url: 'redis://localhost:6379'
//   });

//   redisClient.on('error', (err) => console.log('Redis Client Error', err));

//   await redisClient.connect();

//   // Test writing to Redis
//   await redisClient.set('testKey', 'hello', { EX: 60 });

//   // Test reading from Redis
//   const value = await redisClient.get('testKey');
//   console.log('Redis test value:', value); // Should print "hello"

//   // Close connection
//   await redisClient.quit();
// }

// testRedis();
