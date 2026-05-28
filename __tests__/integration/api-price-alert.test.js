/**
 * Integration tests cho /api/price-alert
 * Option B: Mock DB + Mock Session — test qua HTTP thực với supertest.
 */

jest.mock("../../pages/api/database", () => ({
  query: jest.fn(),
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import db from "../../pages/api/database";
import { getServerSession } from "next-auth";
import { createServer } from "http";
import handler from "../../pages/api/price-alert";
import request from "supertest";

function createTestServer(handlerFn) {
  return createServer(async (req, res) => {
    res.status = (statusCode) => {
      res.statusCode = statusCode;
      return res;
    };
    res.json = (data) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
    };

    const url = new URL(req.url, "http://localhost");
    req.query = Object.fromEntries(url.searchParams.entries());

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch {
        req.body = {};
      }
      handlerFn(req, res);
    });
  });
}

let server;
beforeAll(() => { server = createTestServer(handler); });
afterAll(() => server.close());
beforeEach(() => jest.clearAllMocks());

const loggedIn = { user: { id: "42" } };

// ════════════════════════════════════════════════════════════════════════════════
describe("Integration: GET /api/price-alert (list)", () => {
  test("200 + trả về alerts khi đã login", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query.mockResolvedValue([
      { id: 1, product_id: 10, target_price: 5000000, status: "active", name: "iPhone 16", brand: "apple", latest_price: 6000000 },
    ]);

    const res = await request(server).get("/api/price-alert?status=active");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveLength(1);
  });

  test("200 + mảng rỗng khi không có alert", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query.mockResolvedValue([]);

    const res = await request(server).get("/api/price-alert?status=active");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
describe("Integration: POST /api/price-alert (create)", () => {
  test("401 khi chưa đăng nhập", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await request(server)
      .post("/api/price-alert")
      .send({ productId: 1, targetPrice: 5000000 })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(401);
  });

  test("201 khi tạo alert hợp lệ", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query
      .mockResolvedValueOnce([{ current_price: 10000000 }]) // product price
      .mockResolvedValueOnce({ affectedRows: 1 });           // INSERT

    const res = await request(server)
      .post("/api/price-alert")
      .send({ productId: 1, targetPrice: 7000000 })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("message");
  });

  test("400 khi targetPrice >= giá hiện tại", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query.mockResolvedValueOnce([{ current_price: 5000000 }]);

    const res = await request(server)
      .post("/api/price-alert")
      .send({ productId: 1, targetPrice: 5000000 }) // bằng giá hiện tại
      .set("Content-Type", "application/json");

    expect(res.status).toBe(400);
  });

  test("400 khi body không đủ field", async () => {
    getServerSession.mockResolvedValue(loggedIn);

    const res = await request(server)
      .post("/api/price-alert")
      .send({ productId: 1 }) // thiếu targetPrice
      .set("Content-Type", "application/json");

    expect(res.status).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
describe("Integration: GET /api/price-alert?action=check-triggers", () => {
  test("200 + triggered=1 khi có alert bị kích hoạt", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query.mockResolvedValue([
      {
        id: 5, product_id: 10, target_price: 8000000,
        latest_price: 7000000, // đã xuống dưới target
        status: "active", name: "Samsung S25", brand: "samsung",
      },
    ]);

    const res = await request(server).get("/api/price-alert?action=check-triggers");

    expect(res.status).toBe(200);
    expect(res.body.triggered).toBe(1);
    expect(res.body.triggeredIds).toContain(5);
  });

  test("200 + triggered=0 khi không có alert đạt ngưỡng", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query.mockResolvedValue([
      {
        id: 3, product_id: 11, target_price: 5000000,
        latest_price: 9000000, // còn cao
        status: "active", name: "Xiaomi 15T", brand: "xiaomi",
      },
    ]);

    const res = await request(server).get("/api/price-alert?action=check-triggers");

    expect(res.status).toBe(200);
    expect(res.body.triggered).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
describe("Integration: PUT /api/price-alert (update status)", () => {
  test("401 khi chưa login", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await request(server)
      .put("/api/price-alert")
      .send({ alertId: 1, status: "inactive" })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(401);
  });

  test("200 khi cập nhật thành công", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query.mockResolvedValue({ affectedRows: 1 });

    const res = await request(server)
      .put("/api/price-alert")
      .send({ alertId: 1, status: "inactive" })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
describe("Integration: DELETE /api/price-alert", () => {
  test("401 khi chưa login", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await request(server)
      .delete("/api/price-alert")
      .send({ alertId: 1 })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(401);
  });

  test("200 khi xóa thành công", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query.mockResolvedValue({ affectedRows: 1 });

    const res = await request(server)
      .delete("/api/price-alert")
      .send({ alertId: 1 })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(200);
  });
});
