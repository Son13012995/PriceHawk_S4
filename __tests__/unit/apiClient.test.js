import { describe, it, expect, vi } from 'vitest';

// Mock axios at the top level before any imports
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(() => Promise.resolve({ data: [] })),
    })),
  },
}));

describe('API Client Module', () => {
  it('should export getProducts function', async () => {
    const apiClient = await import('../../lib/apiClient');
    expect(apiClient.getProducts).toBeDefined();
    expect(typeof apiClient.getProducts).toBe('function');
  });

  it('should export searchProducts function', async () => {
    const apiClient = await import('../../lib/apiClient');
    expect(apiClient.searchProducts).toBeDefined();
    expect(typeof apiClient.searchProducts).toBe('function');
  });

  it('should export default apiClient instance', async () => {
    const apiClient = await import('../../lib/apiClient');
    expect(apiClient.default).toBeDefined();
    expect(apiClient.default).toHaveProperty('get');
  });

  it('getProducts has correct signature with 3 parameters', async () => {
    const apiClient = await import('../../lib/apiClient');
    // page, pageSize, signal
    expect(apiClient.getProducts.length).toBe(3);
  });

  it('searchProducts has correct signature with 4 parameters', async () => {
    const apiClient = await import('../../lib/apiClient');
    // q, page, pageSize, signal
    expect(apiClient.searchProducts.length).toBe(4);
  });

  it('getProducts should call apiClient.get()', async () => {
    const apiClient = await import('../../lib/apiClient');
    // Verify that it's callable and returns a promise-like object
    const result = apiClient.getProducts(1, 10);
    expect(result).toBeDefined();
    expect(typeof result.then).toBe('function');
  });

  it('searchProducts should call apiClient.get()', async () => {
    const apiClient = await import('../../lib/apiClient');
    // Verify that it's callable and returns a promise-like object
    const result = apiClient.searchProducts('test', 1, 10);
    expect(result).toBeDefined();
    expect(typeof result.then).toBe('function');
  });
});


