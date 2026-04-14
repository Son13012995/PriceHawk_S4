import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import paginationHandler from '../../../pages/api/pagination';
import { createMockRequest, createMockResponse } from '../../helpers/api';
import { cleanupDatabase, insertTestProduct } from '../../helpers/db';

describe('GET /api/pagination', () => {
  beforeEach(async () => {
    await cleanupDatabase();
    // Insert test products
    for (let i = 1; i <= 20; i++) {
      await insertTestProduct({
        name: `Test Product ${i}`,
        price: 100 + i * 10,
      });
    }
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it('should require search query parameter', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: {},
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    expect(res.statusCode).toBe(400);
  });

  it('should return paginated search results for valid query', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { q: 'Product' },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._data);
    expect(data).toHaveProperty('totalCount');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('pageSize');
    expect(data).toHaveProperty('totalPages');
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return correct pagination metadata', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { q: 'Product', page: '1', pageSize: '5' },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    const data = JSON.parse(res._data);
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(5);
    expect(data.totalPages).toBe(Math.ceil(data.totalCount / 5));
  });

  it('should respect page parameter', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { q: 'Product', page: '2', pageSize: '5' },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    const data = JSON.parse(res._data);
    expect(data.page).toBe(2);
    expect(data.data.length).toBeLessThanOrEqual(5);
  });

  it('should respect pageSize parameter', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { q: 'Product', pageSize: '7' },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    const data = JSON.parse(res._data);
    expect(data.pageSize).toBe(7);
    expect(data.data.length).toBeLessThanOrEqual(7);
  });

  it('should handle case-insensitive search', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { q: 'product' },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    const data = JSON.parse(res._data);
    expect(data.data.length).toBeGreaterThan(0);
  });

  it('should return empty results for non-matching search', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { q: 'nonexistent-xyz-product' },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res._data);
    expect(data.totalCount).toBe(0);
    expect(data.data.length).toBe(0);
  });

  it('should default to page 1 if not provided', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { q: 'Product' },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    const data = JSON.parse(res._data);
    expect(data.page).toBe(1);
  });

  it('should default to pageSize 10 if not provided', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { q: 'Product' },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    const data = JSON.parse(res._data);
    expect(data.pageSize).toBe(10);
  });

  it('should handle empty search query', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { q: '' },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    // May return 400 for empty query or treat as wildcard
    expect([200, 400]).toContain(res.statusCode);
  });

  it('should handle special characters in search query', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { q: '%_[]' },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    expect([200, 400]).toContain(res.statusCode);
  });

  it('should calculate totalPages correctly', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { q: 'Product', pageSize: '3' },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    const data = JSON.parse(res._data);
    const expectedPages = Math.ceil(data.totalCount / 3);
    expect(data.totalPages).toBe(expectedPages);
  });

  it('should handle page beyond totalPages', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: { q: 'Product', page: '999' },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    const data = JSON.parse(res._data);
    expect(data.data.length).toBe(0);
  });
});
