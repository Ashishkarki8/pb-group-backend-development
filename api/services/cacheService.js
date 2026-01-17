// “If data is already cached, use it.
// If not, fetch from DB and cache it.”

import redisClient from "../config/redisClient.js";
/**
 * Generic cache wrapper
 * @param {string} key - Redis key
 * @param {number} ttl - Time to live in seconds
 * @param {function} fetchFn - Function to fetch data from DB
 */

export async function getCachedData(key, ttl, fetchFn) {
  try {
    // 1️⃣ Try cache first
    const cached = await redisClient.get(key);
    
    if (cached) {
      console.log(`✅ [CACHE HIT] ${key}`);
      return JSON.parse(cached);
    }

    // 2️⃣ Cache miss - fetch from DB
    console.log(`❌ [CACHE MISS] ${key} - Fetching from DB...`);
    const data = await fetchFn();

    // 3️⃣ Store in cache
    await redisClient.set(key, JSON.stringify(data), { EX: ttl });
    console.log(`💾 [CACHED] ${key} for ${ttl}s`);

    return data;
  } catch (error) {
    console.error(`🔥 [CACHE ERROR] ${key}:`, error.message);
    // Fallback to DB on Redis failure
    return await fetchFn();
  }
}

/**
 * Invalidate cache by key or pattern //cache gareko data remove garna for like admin register pachi admin save gareko key invalidate empty garna parcha
 */
export async function invalidateCache(pattern) {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`🗑️ [CACHE INVALIDATED] ${keys.length} keys matching "${pattern}"`);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}