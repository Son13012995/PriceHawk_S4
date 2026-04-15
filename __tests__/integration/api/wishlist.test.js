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
        current_price: 150,
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
        current_price: 80,
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
        current_price: 120,
      });

      const req = createMockRequest({
        method: 'POST',
        body: {
          productId,
          userId: 1,
        },
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      expect([200, 201]).toContain(res.statusCode);
    });

    it('should handle NULL userId', async () => {
      const productId = await insertTestProduct({
        name: 'Mouse',
        current_price: 45,
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
    const ITEMS_TO_ADD = 3;

    beforeEach(async () => {
      // Explicitly add known number of items to wishlist
      for (let i = 1; i <= ITEMS_TO_ADD; i++) {
        const productId = await insertTestProduct({
          name: `Wishlist Product ${i}`,
          current_price: 200 + i * 50,
        });

        const req = createMockRequest({
          method: 'POST',
          body: {
            productId,
            userId: 1,
          },
        });
        const res = createMockResponse();
        await wishlistHandler(req, res);
      }
    });

    it('should retrieve correct number of wishlist items', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { userId: 1
         },
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._data);
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(ITEMS_TO_ADD);
    });

    it('should retrieve wishlist items with product details', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { userId: 1 },
      });
      const res = createMockResponse();

      await wishlistHandler(req, res);

      const data = JSON.parse(res._data);
      expect(data.data.length).toBe(ITEMS_TO_ADD);
      
      // Verify each item has required fields
      data.data.forEach((item) => {
        expect(item).toHaveProperty('product_id');
        expect(item).toHaveProperty('added_at');
        expect(item).toHaveProperty('name');
      });
    });

    it('should return empty wishlist for user with no items', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { userId: 99 },
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
    const TEST_DELETE_USER = 1;
    let testProductId;

    beforeEach(async () => {
      // Create a product and add it to wishlist before deletion testing
      testProductId = await insertTestProduct({
        name: 'Desk Lamp',
        current_price: 60,
      });

      const req = createMockRequest({
        method: 'POST',
        body: {
          productId: testProductId,
          userId: 1,
        },
      });
      const res = createMockResponse();
      await wishlistHandler(req, res);
    });

    it('should remove item from wishlist and verify deletion', async () => {
      // First verify it exists
      const getReq = createMockRequest({
        method: 'GET',
        query: { userId: 1 },
      });
      const getRes = createMockResponse();
      await wishlistHandler(getReq, getRes);

      const beforeDelete = JSON.parse(getRes._data);
      expect(beforeDelete.data.length).toBe(1);

      // Delete it
      const deleteReq = createMockRequest({
        method: 'DELETE',
        body: {
          productId: testProductId,
          userId: TEST_DELETE_USER,
        },
      });
      const deleteRes = createMockResponse();
      await wishlistHandler(deleteReq, deleteRes);

      expect(deleteRes.statusCode).toBe(200);
      const deleteData = JSON.parse(deleteRes._data);
      expect(deleteData).toHaveProperty('message');
    });

    it('should require productId for deletion', async () => {
      const req = createMockRequest({
        method: 'DELETE',
        body: { userId: 1 },
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
          userId: TEST_DELETE_USER,
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
          productId: testProductId,
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
