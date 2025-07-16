/**
 * Caching Configuration
 * Implements both Redis and in-memory caching for optimal performance
 */

const NodeCache = require('node-cache');
const redis = require('redis');

class CacheManager {
  constructor() {
    // In-memory cache for frequently accessed data
    this.memoryCache = new NodeCache({
      stdTTL: 600, // 10 minutes default TTL
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false // Better performance
    });

    // Redis cache for distributed caching (optional)
    this.redisClient = null;
    this.initRedis();
  }

  async initRedis() {
    if (process.env.REDIS_URL) {
      try {
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL,
          socket: {
            connectTimeout: 5000,
            lazyConnect: true
          }
        });

        this.redisClient.on('error', (err) => {
          console.error('Redis Client Error:', err);
        });

        this.redisClient.on('connect', () => {
          console.log('Redis connected successfully');
        });

        await this.redisClient.connect();
      } catch (error) {
        console.error('Redis connection failed:', error);
        this.redisClient = null;
      }
    }
  }

  // Get from cache (tries Redis first, then memory)
  async get(key) {
    try {
      // Try Redis first if available
      if (this.redisClient && this.redisClient.isReady) {
        const redisValue = await this.redisClient.get(key);
        if (redisValue !== null) {
          return JSON.parse(redisValue);
        }
      }

      // Fall back to memory cache
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue !== undefined) {
        return memoryValue;
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set in cache (sets in both Redis and memory)
  async set(key, value, ttl = 600) {
    try {
      const serializedValue = JSON.stringify(value);

      // Set in Redis if available
      if (this.redisClient && this.redisClient.isReady) {
        await this.redisClient.setEx(key, ttl, serializedValue);
      }

      // Set in memory cache
      this.memoryCache.set(key, value, ttl);
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete from cache
  async del(key) {
    try {
      // Delete from Redis if available
      if (this.redisClient && this.redisClient.isReady) {
        await this.redisClient.del(key);
      }

      // Delete from memory cache
      this.memoryCache.del(key);
      
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Clear all cache
  async clear() {
    try {
      // Clear Redis if available
      if (this.redisClient && this.redisClient.isReady) {
        await this.redisClient.flushAll();
      }

      // Clear memory cache
      this.memoryCache.flushAll();
      
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }

  // Generate cache key
  generateKey(prefix, ...parts) {
    return `${prefix}:${parts.join(':')}`;
  }

  // Cache statistics
  getStats() {
    return {
      memory: this.memoryCache.getStats(),
      redis: this.redisClient ? this.redisClient.isReady : false
    };
  }
}

// Cache key prefixes
const CACHE_KEYS = {
  USER_PROFILE: 'user_profile',
  SUBSCRIPTION_PLANS: 'subscription_plans',
  COMMUNITY_GROUPS: 'community_groups',
  DASHBOARD_DATA: 'dashboard_data',
  ADDICTION_TYPES: 'addiction_types',
  ACHIEVEMENTS: 'achievements',
  HEALTH_BENEFITS: 'health_benefits',
  DAILY_CHALLENGES: 'daily_challenges',
  LEADERBOARD: 'leaderboard',
  CRISIS_RESOURCES: 'crisis_resources'
};

// Cache TTL values (in seconds)
const CACHE_TTL = {
  SHORT: 300,     // 5 minutes
  MEDIUM: 900,    // 15 minutes
  LONG: 3600,     // 1 hour
  EXTENDED: 14400 // 4 hours
};

// Create singleton instance
const cacheManager = new CacheManager();

module.exports = {
  cache: cacheManager,
  CACHE_KEYS,
  CACHE_TTL
};