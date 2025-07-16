/**
 * Test Setup Configuration
 * Global test setup and teardown
 */

const { Pool } = require('pg');

// Test database configuration
const testDbConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: process.env.TEST_DB_PORT || 5432,
  database: process.env.TEST_DB_NAME || 'recovr_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password',
  max: 5, // Smaller pool for testing
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 1000
};

let testPool;

beforeAll(async () => {
  // Create test database connection
  testPool = new Pool(testDbConfig);
  
  // Override the main database connection for tests
  jest.doMock('../database/connection', () => testPool);
  
  // Wait for database connection
  await testPool.query('SELECT 1');
  
  console.log('Test database connected');
});

afterAll(async () => {
  // Clean up database connections
  if (testPool) {
    await testPool.end();
  }
  
  console.log('Test database disconnected');
});

// Global test configuration
jest.setTimeout(30000); // 30 seconds timeout for all tests

// Suppress console.log in tests unless explicitly needed
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

module.exports = {
  testPool,
  testDbConfig
};