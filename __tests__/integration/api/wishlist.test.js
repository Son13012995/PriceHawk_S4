import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import wishlistHandler from '../../../pages/api/wishlist';
import { createMockRequest, createMockResponse } from '../../helpers/api';
import { cleanupDatabase, insertTestProduct } from '../../helpers/db';

describe('/api/wishlist', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('POST - Add to Wishlist', () => {
    it('should add product to wishlist', async () => {
      const productId = await insertTestProduct({
        name: 'Wireless Headphones',
        price: 150,
      });

      const req = createMockRequest({
        method: 'POST',
        body: { productId },
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._data);
      expect(data).toHaveProperty('message');
      expect(data.message).toContain('wishlist');
    });

    it('should require productId parameter', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {},
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should prevent duplicate wishlist entries', async () => {
      const productId = await insertTestProduct({
        name: 'Bluetooth Speaker',
        price: 80,
      });

      // Add first time
      const req1 = createMockRequest({
        method: 'POST',
        body: { productId },
      });
      const res1 = createMockResponse();
      await wishlistHandler(req1, res1);

      // Try to add second time
      const req2 = createMockRequest({
        method: 'POST',
        body: { productId },
      });
      const res2 = createMockResponse();
      await wishlistHandler(req2, res2);

      expect(res2.statusCode).toBe(409);
    });

    it('should accept userId in wishlist entry', async () => {
      const productId = await insertTestProduct({
        name: 'Keyboard',
        price: 120,
      });

      const req = createMockRequest({
        method: 'POST',
        body: {
          productId,
          userId: 'user-123',
        },
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      expect([200, 201]).toContain(res.statusCode);
    });

    it('should handle NULL userId', async () => {
      const productId = await insertTestProduct({
        name: 'Mouse',
        price: 45,
      });

      const req = createMockRequest({
        method: 'POST',
        body: {
          productId,
          userId: null,
        },
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      expect([200, 201]).toContain(res.statusCode);
    });
  });

  describe('GET - Retrieve Wishlist', () => {
    beforeEach(async () => {
      const productId = await insertTestProduct({
        name: 'Monitor',
        price: 300,
      });

      const req = createMockRequest({
        method: 'POST',
        body: {
          productId,
          userId: 'test-user',
        },
      });
      const res = createMockResponse();
      await wishlistHandler(req, res);
    });

    it('should retrieve wishlist items', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { userId: 'test-user' },
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._data);
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should retrieve wishlist with product details', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { userId: 'test-user' },
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      const data = JSON.parse(res._data);
      if (data.data.length > 0) {
        const item = data.data[0];
        expect(item).toHaveProperty('product_id');
        expect(item).toHaveProperty('added_at');
        expect(item).toHaveProperty('name');
      }
    });

    it('should return empty wishlist for new user', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { userId: 'new-user' },
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._data);
      expect(data.data.length).toBe(0);
    });

    it('should handle NULL userId in GET request', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { userId: null },
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      expect([200, 400]).toContain(res.statusCode);
    });
  });

  describe('DELETE - Remove from Wishlist', () => {
    let productId;

    beforeEach(async () => {
      productId = await insertTestProduct({
        name: 'Desk Lamp',
        price: 60,
      });

      const req = createMockRequest({
        method: 'POST',
        body: {
          productId,
          userId: 'test-user',
        },
      });
      const res = createMockResponse();
      await wishlistHandler(req, res);
    });

    it('should remove item from wishlist', async () => {
      const req = createMockRequest({
        method: 'DELETE',
        body: {
          productId,
          userId: 'test-user',
        },
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._data);
      expect(data).toHaveProperty('message');
    });

    it('should require productId for deletion', async () => {
      const req = createMockRequest({
        method: 'DELETE',
        body: { userId: 'test-user' },
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should handle deletion of non-existent item', async () => {
      const req = createMockRequest({
        method: 'DELETE',
        body: {
          productId: 99999,
          userId: 'test-user',
        },
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      // May return 200 (no-op) or 404
      expect([200, 404]).toContain(res.statusCode);
    });

    it('should handle NULL userId in DELETE', async () => {
      const req = createMockRequest({
        method: 'DELETE',
        body: {
          productId,
          userId: null,
        },
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      expect([200, 400]).toContain(res.statusCode);
    });
  });

  describe('Unsupported Methods', () => {
    it('should handle PUT request', async () => {
      const req = createMockRequest({
        method: 'PUT',
        body: {},
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      expect([405, 400]).toContain(res.statusCode);
    });

    it('should handle PATCH request', async () => {
      const req = createMockRequest({
        method: 'PATCH',
        body: {},
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      expect([405, 400]).toContain(res.statusCode);
    });
  });
});
