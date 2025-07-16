/**
 * Database Query Optimization Utilities
 * Provides query optimization, connection pooling, and monitoring
 */

const { Pool } = require('pg');
const { cache, CACHE_KEYS, CACHE_TTL } = require('../config/cache');

class QueryOptimizer {
  constructor() {
    this.queryStats = new Map();
    this.slowQueryThreshold = 1000; // 1 second
  }

  // Monitor query performance
  logQuery(query, params, duration) {
    const queryKey = this.getQueryKey(query);
    
    if (!this.queryStats.has(queryKey)) {
      this.queryStats.set(queryKey, {
        count: 0,
        totalTime: 0,
        maxTime: 0,
        minTime: Infinity,
        avgTime: 0
      });
    }

    const stats = this.queryStats.get(queryKey);
    stats.count++;
    stats.totalTime += duration;
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.minTime = Math.min(stats.minTime, duration);
    stats.avgTime = stats.totalTime / stats.count;

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      console.warn(`Slow query detected (${duration}ms):`, {
        query: query.substring(0, 200),
        params: params?.length || 0,
        duration
      });
    }
  }

  // Get query key for statistics
  getQueryKey(query) {
    return query.replace(/\$\d+/g, '?').replace(/\s+/g, ' ').trim();
  }

  // Get query statistics
  getQueryStats() {
    const stats = {};
    for (const [query, stat] of this.queryStats) {
      stats[query] = stat;
    }
    return stats;
  }

  // Optimize common queries with prepared statements
  getOptimizedQuery(operation, params = {}) {
    const queries = {
      // User queries
      getUserById: `
        SELECT u.*, s.plan_type, s.status as subscription_status
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        WHERE u.id = $1
      `,
      
      getUserProfile: `
        SELECT u.id, u.email, u.first_name, u.last_name, u.username, 
               u.subscription_plan, u.subscription_status, u.created_at,
               u.achievement_points, u.level, u.experience_points
        FROM users u
        WHERE u.id = $1 AND u.is_active = true
      `,

      // Community queries
      getCommunityGroups: `
        SELECT cg.*, at.name as addiction_type_name, at.color as addiction_type_color,
               u.first_name as creator_first_name, u.username as creator_username,
               COUNT(gm.id) as member_count
        FROM community_groups cg
        LEFT JOIN addiction_types at ON cg.addiction_type_id = at.id
        JOIN users u ON cg.created_by = u.id
        LEFT JOIN group_memberships gm ON cg.id = gm.group_id AND gm.status = 'active'
        WHERE cg.is_public = true
        GROUP BY cg.id, at.name, at.color, u.first_name, u.username
        ORDER BY member_count DESC, cg.created_at DESC
        LIMIT $1 OFFSET $2
      `,

      // Dashboard queries
      getDashboardStats: `
        SELECT 
          COUNT(DISTINCT rp.id) as active_programs,
          MAX(rp.current_streak) as longest_streak,
          COUNT(DISTINCT dc.id) as total_checkins,
          AVG(dc.mood_rating) as avg_mood,
          u.achievement_points,
          u.level,
          u.total_money_saved
        FROM users u
        LEFT JOIN recovery_programs rp ON u.id = rp.user_id AND rp.status = 'active'
        LEFT JOIN daily_checkins dc ON u.id = dc.user_id AND dc.checkin_date >= CURRENT_DATE - INTERVAL '30 days'
        WHERE u.id = $1
        GROUP BY u.id, u.achievement_points, u.level, u.total_money_saved
      `,

      // Gamification queries
      getAchievements: `
        SELECT a.*, ua.earned_at
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
        ORDER BY ua.earned_at DESC NULLS LAST, a.category, a.points DESC
      `,

      // Subscription queries
      getActiveSubscription: `
        SELECT s.*, p.features, p.name as plan_name
        FROM subscriptions s
        LEFT JOIN subscription_plans p ON s.plan_type = p.id
        WHERE s.user_id = $1 AND s.status IN ('active', 'trialing')
        ORDER BY s.created_at DESC
        LIMIT 1
      `
    };

    return queries[operation] || null;
  }

  // Execute optimized query with caching
  async executeOptimized(pool, operation, params = [], cacheKey = null, ttl = CACHE_TTL.MEDIUM) {
    const startTime = Date.now();
    
    try {
      // Try cache first if cache key provided
      if (cacheKey) {
        const cachedResult = await cache.get(cacheKey);
        if (cachedResult) {
          return cachedResult;
        }
      }

      const query = this.getOptimizedQuery(operation, params);
      if (!query) {
        throw new Error(`Unknown operation: ${operation}`);
      }

      const result = await pool.query(query, params);
      const duration = Date.now() - startTime;

      // Log query performance
      this.logQuery(query, params, duration);

      // Cache result if cache key provided
      if (cacheKey && result.rows) {
        await cache.set(cacheKey, result.rows, ttl);
      }

      return result.rows;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logQuery('ERROR', params, duration);
      throw error;
    }
  }

  // Batch query execution
  async executeBatch(pool, queries) {
    const client = await pool.connect();
    const results = [];
    
    try {
      await client.query('BEGIN');
      
      for (const query of queries) {
        const result = await client.query(query.text, query.params);
        results.push(result.rows);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Connection health check
  async healthCheck(pool) {
    const startTime = Date.now();
    
    try {
      const result = await pool.query('SELECT 1 as health_check');
      const duration = Date.now() - startTime;
      
      return {
        healthy: true,
        responseTime: duration,
        connections: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount
        }
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        connections: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount
        }
      };
    }
  }
}

// Create singleton instance
const queryOptimizer = new QueryOptimizer();

// Enhanced pool configuration
const createOptimizedPool = () => {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of connections
    idleTimeoutMillis: 30000, // 30 seconds
    connectionTimeoutMillis: 2000, // 2 seconds
    maxUses: 7500, // Maximum uses before connection is closed
    
    // Query timeout
    query_timeout: 30000, // 30 seconds
    
    // Statement timeout
    statement_timeout: 30000, // 30 seconds
    
    // Connection configuration
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });
};

module.exports = {
  queryOptimizer,
  createOptimizedPool
};