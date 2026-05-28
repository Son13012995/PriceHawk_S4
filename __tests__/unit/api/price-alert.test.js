/**
 * Unit tests cho pages/api/price-alert.js
 *
 * Strategy: Mock toàn bộ DB (pages/api/database) và next-auth session.
 * Gọi handler() trực tiếp với req/res giả — không cần HTTP server.
 */

// ── Mock dependencies ──────────────────────────────────────────────────────────
jest.mock("../../../pages/api/database", () => ({
  query: jest.fn(),
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import db from "../../../pages/api/database";
import { getServerSession } from "next-auth";
import handler from "../../../pages/api/price-alert";

// ── Helper: tạo req/res giả ──────────────────────────────────────────────────
function mockReqRes(method = "GET", query = {}, body = {}) {
  const req = { method, query, body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

// ── Helpers: mock session ──────────────────────────────────────────────────────
const mockLoggedInSession = { user: { id: "42" } };
const mockAnonymousSession = null;

beforeEach(() => {
  jest.clearAllMocks();
});

// ════════════════════════════════════════════════════════════════════════════════
// GET — Lấy danh sách alerts
// ════════════════════════════════════════════════════════════════════════════════
describe("GET /api/price-alert", () => {
  test("trả về danh sách alerts của user đã login", async () => {
    getServerSession.mockResolvedValue(mockLoggedInSession);
    const fakeAlerts = [
      { id: 1, product_id: 10, target_price: 5000000, status: "active" },
    ];
    db.query.mockResolvedValue(fakeAlerts);

    const { req, res } = mockReqRes("GET", { status: "active" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: fakeAlerts });
  });

  test("anonymous user chỉ thấy alerts của null user_id (không bị lỗi)", async () => {
    getServerSession.mockResolvedValue(mockAnonymousSession);
    db.query.mockResolvedValue([]);

    const { req, res } = mockReqRes("GET", { status: "active" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    // userId = null được truyền vào query — đúng logic NULL-safe
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE pa.`user_id` <=> ?"),
      expect.arrayContaining([null])
    );
  });

  test("trả về 500 khi DB lỗi", async () => {
    getServerSession.mockResolvedValue(mockLoggedInSession);
    db.query.mockRejectedValue(new Error("DB connection failed"));

    const { req, res } = mockReqRes("GET", {});
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// POST — Tạo alert mới
// ════════════════════════════════════════════════════════════════════════════════
describe("POST /api/price-alert", () => {
  test("trả về 401 khi chưa đăng nhập", async () => {
    getServerSession.mockResolvedValue(mockAnonymousSession);

    const { req, res } = mockReqRes("POST", {}, { productId: 1, targetPrice: 5000000 });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("trả về 400 khi thiếu productId hoặc targetPrice", async () => {
    getServerSession.mockResolvedValue(mockLoggedInSession);

    const { req, res } = mockReqRes("POST", {}, { productId: 1 }); // thiếu targetPrice
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("trả về 400 khi targetPrice >= giá hiện tại", async () => {
    getServerSession.mockResolvedValue(mockLoggedInSession);
    // DB trả về currentPrice = 10,000,000
    db.query.mockResolvedValueOnce([{ current_price: 10000000 }]);

    const { req, res } = mockReqRes("POST", {}, {
      productId: 1,
      targetPrice: 10000000, // bằng giá hiện tại → không hợp lệ
    });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("thấp hơn") })
    );
  });

  test("tạo alert thành công khi targetPrice < giá hiện tại", async () => {
    getServerSession.mockResolvedValue(mockLoggedInSession);
    db.query
      .mockResolvedValueOnce([{ current_price: 10000000 }]) // SELECT product price
      .mockResolvedValueOnce({ affectedRows: 1 });           // INSERT alert

    const { req, res } = mockReqRes("POST", {}, {
      productId: 1,
      targetPrice: 7000000,
      note: "Muốn mua khi giá xuống",
    });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  test("trả về 404 khi product không tồn tại", async () => {
    getServerSession.mockResolvedValue(mockLoggedInSession);
    db.query.mockResolvedValueOnce([]); // product không có trong DB

    const { req, res } = mockReqRes("POST", {}, { productId: 9999, targetPrice: 5000000 });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// GET ?action=check-triggers — Kiểm tra alerts đã kích hoạt (READ-ONLY)
// ════════════════════════════════════════════════════════════════════════════════
describe("GET /api/price-alert?action=check-triggers", () => {
  test("trả về triggered=1 khi latest_price <= target_price", async () => {
    getServerSession.mockResolvedValue(mockLoggedInSession);
    db.query.mockResolvedValue([
      {
        id: 1,
        product_id: 10,
        target_price: 8000000,
        latest_price: 7500000, // giá đã xuống dưới target
        status: "active",
        name: "iPhone 16",
        brand: "apple",
      },
    ]);

    const { req, res } = mockReqRes("GET", { action: "check-triggers" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.triggered).toBe(1);
    expect(jsonArg.details[0].triggered).toBe(true);
  });

  test("trả về triggered=0 khi latest_price > target_price", async () => {
    getServerSession.mockResolvedValue(mockLoggedInSession);
    db.query.mockResolvedValue([
      {
        id: 2,
        product_id: 11,
        target_price: 5000000,
        latest_price: 9000000, // giá còn cao
        status: "active",
        name: "Samsung S25",
        brand: "samsung",
      },
    ]);

    const { req, res } = mockReqRes("GET", { action: "check-triggers" });
    await handler(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.triggered).toBe(0);
    expect(jsonArg.details[0].triggered).toBe(false);
  });

  test("trả về checked=0 khi không có active alert nào", async () => {
    getServerSession.mockResolvedValue(mockLoggedInSession);
    db.query.mockResolvedValue([]);

    const { req, res } = mockReqRes("GET", { action: "check-triggers" });
    await handler(req, res);

    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.checked).toBe(0);
    expect(jsonArg.triggered).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// PUT — Cập nhật status alert
// ════════════════════════════════════════════════════════════════════════════════
describe("PUT /api/price-alert", () => {
  test("trả về 401 khi chưa đăng nhập", async () => {
    getServerSession.mockResolvedValue(mockAnonymousSession);
    const { req, res } = mockReqRes("PUT", {}, { alertId: 1, status: "inactive" });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("cập nhật status thành công", async () => {
    getServerSession.mockResolvedValue(mockLoggedInSession);
    db.query.mockResolvedValue({ affectedRows: 1 });

    const { req, res } = mockReqRes("PUT", {}, { alertId: 1, status: "inactive" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("trả về 400 khi thiếu alertId hoặc status", async () => {
    getServerSession.mockResolvedValue(mockLoggedInSession);
    const { req, res } = mockReqRes("PUT", {}, { alertId: 1 }); // thiếu status
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// DELETE — Xóa alert
// ════════════════════════════════════════════════════════════════════════════════
describe("DELETE /api/price-alert", () => {
  test("trả về 401 khi chưa đăng nhập", async () => {
    getServerSession.mockResolvedValue(mockAnonymousSession);
    const { req, res } = mockReqRes("DELETE", {}, { alertId: 1 });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("xóa alert thành công", async () => {
    getServerSession.mockResolvedValue(mockLoggedInSession);
    db.query.mockResolvedValue({ affectedRows: 1 });

    const { req, res } = mockReqRes("DELETE", {}, { alertId: 1 });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM"),
      expect.arrayContaining([1])
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Method Not Allowed
// ════════════════════════════════════════════════════════════════════════════════
describe("Method Not Allowed", () => {
  test("trả về 405 cho PATCH", async () => {
    getServerSession.mockResolvedValue(mockLoggedInSession);
    const { req, res } = mockReqRes("PATCH", {}, {});
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
