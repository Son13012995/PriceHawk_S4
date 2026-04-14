import { beforeEach, afterEach, vi } from 'vitest';
import mysql from 'mysql2/promise';

let pool;

/**
 * Get test database pool
 */
export async function getTestPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT),
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
}

/**
 * Close test database pool
 */
export async function closeTestPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Mock fetch for API routes
 */
export function mockFetch() {
  global.fetch = vi.fn();
  return global.fetch;
}

/**
 * Reset all mocks
 */
export function resetMocks() {
  vi.clearAllMocks();
}
