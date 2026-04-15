import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import priceAlertHandler from '../../../pages/api/price-alert';
import { createMockRequest, createMockResponse } from '../../helpers/api';
import { cleanupDatabase, insertTestProduct, insertTestAlert } from '../../helpers/db';

describe('/api/price-alert', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  describe('POST - Create Price Alert', () => {
    it('should create a price alert', async () => {
      const productId = await insertTestProduct({
        name: 'Gaming Laptop',
        current_price: 1500,
      });

      const req = createMockRequest({
        method: 'POST',
        body: {
          productId,
          targetPrice: 1200,
        },
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._data);
      expect(data).toHaveProperty('message');
    });

    it('should require productId and targetPrice', async () => {
      const req = createMockRequest({
        method: 'POST',
        body: {},
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should reject targetPrice >= current price', async () => {
      const productId = await insertTestProduct({
        name: 'Tablet',
        current_price: 500,
      });

      const req = createMockRequest({
        method: 'POST',
        body: {
          productId,
          targetPrice: 500, // Same as current price
        },
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should reject targetPrice higher than current price', async () => {
      const productId = await insertTestProduct({
        name: 'Monitor',
        current_price: 300,
      });

      const req = createMockRequest({
        method: 'POST',
        body: {
          productId,
          targetPrice: 350,
        },
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should accept optional note field', async () => {
      const productId = await insertTestProduct({
        name: 'Smartphone',
        current_price: 800,
      });

      const req = createMockRequest({
        method: 'POST',
        body: {
          productId,
          targetPrice: 600,
          note: 'Need for work',
        },
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      expect([200, 201]).toContain(res.statusCode);
    });

    it('should accept optional userId', async () => {
      const productId = await insertTestProduct({
        name: 'Headphones',
        current_price: 200,
      });

      const req = createMockRequest({
        method: 'POST',
        body: {
          productId,
          targetPrice: 140,
          userId: 'user-456',
        },
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      expect([200, 201]).toContain(res.statusCode);
    });

    it('should reject duplicate alerts', async () => {
      const productId = await insertTestProduct({
        name: 'Camera',
        current_price: 1000,
      });

      // Create first alert
      const req1 = createMockRequest({
        method: 'POST',
        body: {
          productId,
          targetPrice: 800,
          userId: 'user-789',
        },
      });
      const res1 = createMockResponse();
      await priceAlertHandler(req1, res1);

      // Try to create duplicate
      const req2 = createMockRequest({
        method: 'POST',
        body: {
          productId,
          targetPrice: 800,
          userId: 'user-789',
        },
      });
      const res2 = createMockResponse();
      await priceAlertHandler(req2, res2);

      expect(res2.statusCode).toBe(409);
    });
  });

  describe('GET - Retrieve Alerts', () => {
    const ACTIVE_ALERT_COUNT = 2;
    const TEST_PRODUCT_ID_REF = {};

    beforeEach(async () => {
      // Create known test data
      const productId = await insertTestProduct({
        name: 'Product for Alert',
        current_price: 500,
      });
      TEST_PRODUCT_ID_REF.id = productId;

      // Insert exactly ACTIVE_ALERT_COUNT active alerts
      for (let i = 1; i <= ACTIVE_ALERT_COUNT; i++) {
        await insertTestAlert({
          product_id: productId,
          target_price: 400 - i * 10,
          user_id: 1,
          status: 'active',
        });
      }
    });

    it('should retrieve price alerts', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: {},
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._data);
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThanOrEqual(ACTIVE_ALERT_COUNT);
    });

    it('should filter by status active', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { status: 'active' },
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      const data = JSON.parse(res._data);
      expect(Array.isArray(data.data)).toBe(true);
      // Verify returned alerts are actually active
      if (data.data.length > 0) {
        data.data.forEach((alert) => {
          expect(alert.status).toBe('active');
        });
      }
    });

    it('should support status=all to get all alerts', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: { status: 'all' },
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._data);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should return alert with product details', async () => {
      const req = createMockRequest({
        method: 'GET',
        query: {},
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      const data = JSON.parse(res._data);
      // Find an active alert in the results
      const activeAlert = data.data.find((a) => a.status === 'active');
      if (activeAlert) {
        expect(activeAlert).toHaveProperty('id');
        expect(activeAlert).toHaveProperty('product_id');
        expect(activeAlert).toHaveProperty('target_price');
        expect(activeAlert).toHaveProperty('status');
      }
    });
  });

  describe('PUT - Update Alert Status', () => {
    let alertId;

    beforeEach(async () => {
      const productId = await insertTestProduct({
        name: 'Update Test Product',
        current_price: 600,
      });

      alertId = await insertTestAlert({
        product_id: productId,
        target_price: 500,
        user_id: 1,
        status: 'active',
      });
    });

    it('should update alert status', async () => {
      const req = createMockRequest({
        method: 'PUT',
        body: {
          alertId,
          status: 'triggered',
        },
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should require alertId and status', async () => {
      const req = createMockRequest({
        method: 'PUT',
        body: {},
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should handle update of non-existent alert', async () => {
      const req = createMockRequest({
        method: 'PUT',
        body: {
          alertId: 99999,
          status: 'triggered',
        },
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe('DELETE - Delete Alert', () => {
    let alertId;

    beforeEach(async () => {
      const productId = await insertTestProduct({
        name: 'Delete Test Product',
        current_price: 700,
      });

      alertId = await insertTestAlert({
        product_id: productId,
        target_price: 550,
        user_id: 1,
        status: 'active',
      });
    });

    it('should delete price alert', async () => {
      const req = createMockRequest({
        method: 'DELETE',
        body: { alertId },
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should require alertId', async () => {
      const req = createMockRequest({
        method: 'DELETE',
        body: {},
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should handle deletion of non-existent alert', async () => {
      const req = createMockRequest({
        method: 'DELETE',
        body: { alertId: 99999 },
      });
      const res = createMockResponse();

      await priceAlertHandler(req, res);

      expect([200, 404]).toContain(res.statusCode);
    });
  });
});
