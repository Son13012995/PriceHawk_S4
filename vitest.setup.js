import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import dotenv from 'dotenv';

// Load .env.test file - override any existing env vars
dotenv.config({ path: '.env.test', override: true });

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: (props) => {
    // Return a simple img element without JSX syntax
    const img = document.createElement('img');
    Object.assign(img, props);
    return img;
  },
}));

// Mock environment variables for tests
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'rootpassword';
process.env.DB_NAME = process.env.DB_NAME || 'pricecomparison';
process.env.DB_PORT = process.env.DB_PORT || '3307';
