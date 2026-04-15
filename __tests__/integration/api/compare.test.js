import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import compareHandler from '../../../pages/api/compare';
import { createMockRequest, createMockResponse } from '../../helpers/api';
import { cleanupDatabase, insertTestProduct } from '../../helpers/db';

describe('GET /api/compare', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('Parameter Validation', () => {
    it('should require id parameter', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: {},
      });
      const res = createMockResponse();

      await compareHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should handle invalid ID format', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { id: 'invalid-id' },
      });
      const res = createMockResponse();

      await compareHandler(req, res);

      // Should handle gracefully
      expect([200, 400, 404]).toContain(res.statusCode);
    });

    it('should handle NULL id parameter', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { id: null },
      });
      const res = createMockResponse();

      await compareHandler(req, res);

      expect([400, 404]).toContain(res.statusCode);
    });

    it('should handle non-existent product ID', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { id: '99999' },
      });
      const res = createMockResponse();

      await compareHandler(req, res);

      // May return 200 with empty data or 404
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('Compare Data Structure', () => {
    it('should return product comparison data for valid ID', async () => {
      const productId = await insertTestProduct({
        name: 'MacBook Pro',
        current_price: 1299,
      });

      const req = createMockRequest({
        method: 'GET',
        query: { id: productId.toString() },
      });
      const res = createMockResponse();

      await compareHandler(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._data);
      expect(data).toHaveProperty('product');
      expect(data).toHaveProperty('comparison');
      expect(Array.isArray(data.product)).toBe(true);
      expect(Array.isArray(data.comparison)).toBe(true);
    });

    it('should include product with required fields', async () => {
      const productId = await insertTestProduct({
        name: 'iPad Air',
        current_price: 599,
      });

      const req = createMockRequest({
        method: 'GET',
        query: { id: productId.toString() },
      });
      const res = createMockResponse();

      await compareHandler(req, res);

      const data = JSON.parse(res._data);
      expect(data.product.length).toBeGreaterThan(0);
      const product = data.product[0];

      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('min_price');
      expect(product).toHaveProperty('retailer_count');
    });

    it('should return empty comparison for product with no retailers', async () => {
      const productId = await insertTestProduct({
        name: 'Isolated Product',
        current_price: 299,
      });

      const req = createMockRequest({
        method: 'GET',
        query: { id: productId.toString() },
      });
      const res = createMockResponse();

      await compareHandler(req, res);

      const data = JSON.parse(res._data);
      expect(data.product).toHaveLength(1);
      expect(data.comparison).toHaveLength(0);
    });
  });
});
