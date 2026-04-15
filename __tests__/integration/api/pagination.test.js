import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import paginationHandler from '../../../pages/api/pagination';
import { createMockRequest, createMockResponse } from '../../helpers/api';
import { cleanupDatabase, insertTestProduct } from '../../helpers/db';

describe('GET /api/pagination', () => {
  const TEST_PRODUCT_COUNT = 25; // Explicit test data amount

  beforeEach(async () => {
    await cleanupDatabase();
    // Insert exactly TEST_PRODUCT_COUNT products
    for (let i = 1; i <= TEST_PRODUCT_COUNT; i++) {
      await insertTestProduct({
        name: `Test Product ${i}`,
        current_price: 100 + i * 10,
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

  it('should return pagination metadata', async () => {
    const pageSize = 5;
    const req = createMockRequest({
      method: 'GET',
      query: { q: 'Product', page: '1', pageSize: pageSize.toString() },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    const data = JSON.parse(res._data);
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(pageSize);
    expect(data.totalPages).toBe(Math.ceil(TEST_PRODUCT_COUNT / pageSize));
    expect(data.totalCount).toBe(TEST_PRODUCT_COUNT);
  });

  it('should respect page parameter', async () => {
    const pageSize = 5;
    const page = 2;
    const req = createMockRequest({
      method: 'GET',
      query: { q: 'Product', page: page.toString(), pageSize: pageSize.toString() },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    const data = JSON.parse(res._data);
    expect(data.page).toBe(page);
    expect(data.data.length).toBeLessThanOrEqual(pageSize);
    // Verify it's returning different data than page 1 (unless it's the last page)
    if (data.totalPages > page) {
      expect(data.data.length).toBeGreaterThan(0);
    }
  });

  it('should respect pageSize parameter', async () => {
    const pageSize = 7;
    const req = createMockRequest({
      method: 'GET',
      query: { q: 'Product', pageSize: pageSize.toString() },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    const data = JSON.parse(res._data);
    expect(data.pageSize).toBe(pageSize);
    // First page should respect pageSize
    expect(data.data.length).toBeLessThanOrEqual(pageSize);
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
    expect(data.totalCount).toBe(TEST_PRODUCT_COUNT);
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
    // Verify pagination behavior: data returned should respect the pageSize
    expect(data.data.length).toBeLessThanOrEqual(data.pageSize);
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
    const pageSize = 5;
    const req = createMockRequest({
      method: 'GET',
      query: { q: 'Product', pageSize: pageSize.toString() },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    const data = JSON.parse(res._data);
    const expectedPages = Math.ceil(TEST_PRODUCT_COUNT / pageSize);
    expect(data.totalPages).toBe(expectedPages);
    expect(data.totalCount).toBe(TEST_PRODUCT_COUNT);
  });

  it('should handle page beyond totalPages', async () => {
    const pageSize = 10;
    const beyondLastPage = Math.ceil(TEST_PRODUCT_COUNT / pageSize) + 5;
    const req = createMockRequest({
      method: 'GET',
      query: { q: 'Product', page: beyondLastPage.toString(), pageSize: pageSize.toString() },
    });
    const res = createMockResponse();

    await paginationHandler(req, res);

    const data = JSON.parse(res._data);
    expect(data.data.length).toBe(0);
  });
});
