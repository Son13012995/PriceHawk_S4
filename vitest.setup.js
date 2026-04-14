import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

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
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'pricecomparison_test';
process.env.DB_PORT = '3306';
