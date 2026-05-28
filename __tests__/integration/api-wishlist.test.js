/**
 * Integration tests cho /api/wishlist
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
import handler from "../../pages/api/wishlist";
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

const loggedIn = { user: { id: "99" } };
const fakeWishlistItems = [
  { id: 1, product_id: 10, name: "Dell XPS 15", brand: "dell", current_price: 35000000 },
];

// ════════════════════════════════════════════════════════════════════════════════
describe("Integration: GET /api/wishlist", () => {
  test("200 + trả về danh sách wishlist", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query.mockResolvedValue(fakeWishlistItems);

    const res = await request(server).get("/api/wishlist");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ product_id: 10, brand: "dell" });
  });

  test("200 + mảng rỗng khi wishlist chưa có gì", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query.mockResolvedValue([]);

    const res = await request(server).get("/api/wishlist");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
describe("Integration: POST /api/wishlist — Full add flow", () => {
  test("401 khi chưa đăng nhập", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await request(server)
      .post("/api/wishlist")
      .send({ productId: 10 })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(401);
  });

  test("201 khi thêm sản phẩm mới vào wishlist", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query
      .mockResolvedValueOnce([])                   // SELECT → chưa có
      .mockResolvedValueOnce({ affectedRows: 1 }); // INSERT

    const res = await request(server)
      .post("/api/wishlist")
      .send({ productId: 10 })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("message", "Added to wishlist");
  });

  test("409 khi sản phẩm đã có trong wishlist (duplicate)", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query.mockResolvedValueOnce([{ id: 5 }]); // SELECT → đã tồn tại

    const res = await request(server)
      .post("/api/wishlist")
      .send({ productId: 10 })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error", "Already in wishlist");
  });

  test("400 khi không có productId trong body", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    const res = await request(server)
      .post("/api/wishlist")
      .send({})
      .set("Content-Type", "application/json");
    expect(res.status).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
describe("Integration: DELETE /api/wishlist — Full remove flow", () => {
  test("401 khi chưa đăng nhập", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await request(server)
      .delete("/api/wishlist")
      .send({ productId: 10 })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(401);
  });

  test("200 khi xóa thành công", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query.mockResolvedValue({ affectedRows: 1 });

    const res = await request(server)
      .delete("/api/wishlist")
      .send({ productId: 10 })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Removed from wishlist");
  });

  test("400 khi thiếu productId", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    const res = await request(server)
      .delete("/api/wishlist")
      .send({})
      .set("Content-Type", "application/json");
    expect(res.status).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
describe("Integration: Full CRUD flow (add → get → delete)", () => {
  test("thêm → lấy → xóa thành công", async () => {
    getServerSession.mockResolvedValue(loggedIn);

    // 1. Thêm mới
    db.query
      .mockResolvedValueOnce([])                   // SELECT check duplicate
      .mockResolvedValueOnce({ affectedRows: 1 }); // INSERT

    const addRes = await request(server)
      .post("/api/wishlist")
      .send({ productId: 20 })
      .set("Content-Type", "application/json");
    expect(addRes.status).toBe(201);

    // 2. GET để xác nhận có trong list
    db.query.mockResolvedValueOnce([{ id: 10, product_id: 20, name: "Asus VivoBook", brand: "asus", current_price: 12000000 }]);
    const getRes = await request(server).get("/api/wishlist");
    expect(getRes.status).toBe(200);
    expect(getRes.body.data[0].product_id).toBe(20);

    // 3. Xóa
    db.query.mockResolvedValueOnce({ affectedRows: 1 });
    const deleteRes = await request(server)
      .delete("/api/wishlist")
      .send({ productId: 20 })
      .set("Content-Type", "application/json");
    expect(deleteRes.status).toBe(200);
  });
});
