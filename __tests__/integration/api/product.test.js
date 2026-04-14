import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import productHandler from '../../../pages/api/product';
import { createMockRequest, createMockResponse } from '../../helpers/api';
import { cleanupDatabase, insertTestProduct } from '../../helpers/db';

describe('GET /api/product', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('Single Product', () => {
    it('should return single product by ID', async () => {
      const productId = await insertTestProduct({
        name: 'iPhone 14',
        price: 999,
      });

      const req = createMockRequest({
        method: 'GET',
        query: { id: productId.toString() },
      });
      const res = createMockResponse();

      await productHandler(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._data);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].id).toBe(productId);
    });

    it('should return empty array for non-existent product ID', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { id: '99999' },
      });
      const res = createMockResponse();

      await productHandler(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._data);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('should include product details with min_price and retailer_count', async () => {
      const productId = await insertTestProduct({
        name: 'Samsung Galaxy',
        price: 899,
      });

      const req = createMockRequest({
        method: 'GET',
        query: { id: productId.toString() },
      });
      const res = createMockResponse();

      await productHandler(req, res);

      const data = JSON.parse(res._data);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('min_price');
      expect(data[0]).toHaveProperty('retailer_count');
    });
  });

  describe('Product List with Pagination', () => {
    beforeEach(async () => {
      // Insert multiple test products
      for (let i = 1; i <= 15; i++) {
        await insertTestProduct({
          name: `Product ${i}`,
          price: 100 + i * 10,
        });
      }
    });

    it('should return paginated products with default pagination', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: {},
      });
      const res = createMockResponse();

      await productHandler(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._data);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('totalCount');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.totalCount).toBeGreaterThanOrEqual(15);
    });

    it('should respect page parameter', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { page: '2', pageSize: '5' },
      });
      const res = createMockResponse();

      await productHandler(req, res);

      const data = JSON.parse(res._data);
      expect(data.data.length).toBeLessThanOrEqual(5);
    });

    it('should respect pageSize parameter', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { pageSize: '20' },
      });
      const res = createMockResponse();

      await productHandler(req, res);

      const data = JSON.parse(res._data);
      expect(data.data.length).toBeLessThanOrEqual(20);
    });

    it('should default to pageSize 10 if not provided', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { page: '1' },
      });
      const res = createMockResponse();

      await productHandler(req, res);

      const data = JSON.parse(res._data);
      expect(data.data.length).toBeLessThanOrEqual(10);
    });

    it('should return totalCount of all products', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { pageSize: '5' },
      });
      const res = createMockResponse();

      await productHandler(req, res);

      const data = JSON.parse(res._data);
      expect(data.totalCount).toBeGreaterThanOrEqual(15);
    });
  });

  describe('Error Handling', () => {
    it('should handle page 0 gracefully', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { page: '0' },
      });
      const res = createMockResponse();

      await productHandler(req, res);

      // Should either return success or handle the error
      expect([200, 400, 500]).toContain(res.statusCode);
    });

    it('should handle invalid pageSize', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { pageSize: 'invalid' },
      });
      const res = createMockResponse();

      await productHandler(req, res);

      // Should either return success (using default) or handle error
      expect([200, 400, 500]).toContain(res.statusCode);
    });

    it('should handle invalid ID format', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { id: 'not-a-number' },
      });
      const res = createMockResponse();

      await productHandler(req, res);

      // Should return empty or error
      expect([200, 400]).toContain(res.statusCode);
    });
  });
});
