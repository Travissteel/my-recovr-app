/**
 * Authentication System Tests
 * Tests for user registration, login, email verification, and subscription management
 */

const request = require('supertest');
const app = require('../index');
const db = require('../database/connection');

describe('Authentication System', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
  });

  describe('User Registration', () => {
    test('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        phone: '+1234567890',
        dateOfBirth: '1990-01-01',
        gender: 'other'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.id).toBeDefined();
      
      testUser = response.body.user;
    });

    test('should reject duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User2',
        username: 'testuser2'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });

    test('should reject weak password', async () => {
      const userData = {
        email: 'test2@example.com',
        password: '123',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser3'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toContain('password');
    });
  });

  describe('User Login', () => {
    test('should login with valid credentials', async () => {
      // First verify the user's email
      await db.query('UPDATE users SET is_verified = true WHERE id = $1', [testUser.id]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      
      authToken = response.body.token;
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toContain('Invalid');
    });

    test('should reject unverified user', async () => {
      // Set user as unverified
      await db.query('UPDATE users SET is_verified = false WHERE id = $1', [testUser.id]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        })
        .expect(403);

      expect(response.body.error).toContain('verify');
      
      // Restore verified status
      await db.query('UPDATE users SET is_verified = true WHERE id = $1', [testUser.id]);
    });
  });

  describe('Protected Routes', () => {
    test('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.error).toContain('required');
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toContain('Invalid');
    });
  });
});

describe('Subscription System', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Create test user
    const userData = {
      email: 'subscription-test@example.com',
      password: 'TestPassword123!',
      firstName: 'Sub',
      lastName: 'Test',
      username: 'subtest'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    testUser = response.body.user;
    
    // Verify user and login
    await db.query('UPDATE users SET is_verified = true WHERE id = $1', [testUser.id]);
    
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM users WHERE email = $1', ['subscription-test@example.com']);
  });

  describe('Subscription Plans', () => {
    test('should get subscription plans', async () => {
      const response = await request(app)
        .get('/api/subscriptions/plans')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.plans.FREE).toBeDefined();
      expect(response.body.plans.PREMIUM_MONTHLY).toBeDefined();
      expect(response.body.plans.PREMIUM_YEARLY).toBeDefined();
      expect(response.body.plans.LIFETIME).toBeDefined();
      expect(response.body.plans.PROFESSIONAL).toBeDefined();
    });

    test('should get current subscription', async () => {
      const response = await request(app)
        .get('/api/subscriptions/current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.subscription.plan).toBe('free');
    });
  });

  describe('Premium Features', () => {
    test('should block premium features for free users', async () => {
      const response = await request(app)
        .post('/api/community/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Private Group',
          description: 'A test private group',
          isPublic: false
        })
        .expect(403);

      expect(response.body.subscription_required).toBe(true);
    });

    test('should allow public group creation for free users', async () => {
      const response = await request(app)
        .post('/api/community/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Public Group',
          description: 'A test public group',
          isPublic: true
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});

describe('Performance Tests', () => {
  test('should respond within acceptable time limits', async () => {
    const start = Date.now();
    
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500); // Should respond within 500ms
    expect(response.headers['x-response-time']).toBeDefined();
  });

  test('should compress responses', async () => {
    const response = await request(app)
      .get('/api/subscriptions/plans')
      .set('Accept-Encoding', 'gzip')
      .expect(200);

    // Check if response is compressed
    expect(response.headers['content-encoding']).toBe('gzip');
  });

  test('should cache responses', async () => {
    // First request
    const response1 = await request(app)
      .get('/api/subscriptions/plans')
      .expect(200);

    expect(response1.headers['x-cache']).toBe('MISS');

    // Second request should be cached
    const response2 = await request(app)
      .get('/api/subscriptions/plans')
      .expect(200);

    expect(response2.headers['x-cache']).toBe('HIT');
  });
});