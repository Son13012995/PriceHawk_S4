/**
 * Unit tests cho pages/api/wishlist.js
 * Mock DB và next-auth session.
 */

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
import handler from "../../../pages/api/wishlist";

function mockReqRes(method = "GET", body = {}) {
  const req = { method, body, query: {} };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

const loggedIn = { user: { id: "42" } };
const anonymous = null;

beforeEach(() => jest.clearAllMocks());

// ════════════════════════════════════════════════════════════════════════════════
// GET — Lấy wishlist
// ════════════════════════════════════════════════════════════════════════════════
describe("GET /api/wishlist", () => {
  test("trả về danh sách wishlist của user", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    const fakeData = [
      { id: 1, product_id: 10, name: "iPhone 16", current_price: 22000000 },
    ];
    db.query.mockResolvedValue(fakeData);

    const { req, res } = mockReqRes("GET");
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: fakeData });
  });

  test("anonymous user thấy wishlist với userId=null (không crash)", async () => {
    getServerSession.mockResolvedValue(anonymous);
    db.query.mockResolvedValue([]);

    const { req, res } = mockReqRes("GET");
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE w.`user_id` <=> ?"),
      [null]
    );
  });

  test("trả về 500 khi DB lỗi", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query.mockRejectedValue(new Error("DB timeout"));

    const { req, res } = mockReqRes("GET");
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// POST — Thêm vào wishlist
// ════════════════════════════════════════════════════════════════════════════════
describe("POST /api/wishlist", () => {
  test("trả về 401 khi chưa đăng nhập", async () => {
    getServerSession.mockResolvedValue(anonymous);
    const { req, res } = mockReqRes("POST", { productId: 10 });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("trả về 400 khi thiếu productId", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    const { req, res } = mockReqRes("POST", {}); // không có productId
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("trả về 409 khi product đã có trong wishlist", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query.mockResolvedValueOnce([{ id: 5 }]); // Existing record found

    const { req, res } = mockReqRes("POST", { productId: 10 });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: "Already in wishlist" });
  });

  test("thêm thành công khi chưa có trong wishlist", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query
      .mockResolvedValueOnce([])                    // SELECT → không có duplicate
      .mockResolvedValueOnce({ affectedRows: 1 });  // INSERT

    const { req, res } = mockReqRes("POST", { productId: 10 });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: "Added to wishlist" });
    expect(db.query).toHaveBeenCalledTimes(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// DELETE — Xóa khỏi wishlist
// ════════════════════════════════════════════════════════════════════════════════
describe("DELETE /api/wishlist", () => {
  test("trả về 401 khi chưa đăng nhập", async () => {
    getServerSession.mockResolvedValue(anonymous);
    const { req, res } = mockReqRes("DELETE", { productId: 10 });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("trả về 400 khi thiếu productId", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    const { req, res } = mockReqRes("DELETE", {});
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("xóa thành công", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    db.query.mockResolvedValue({ affectedRows: 1 });

    const { req, res } = mockReqRes("DELETE", { productId: 10 });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM"),
      [10, 42] // productId=10, userId=42
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// Method Not Allowed
// ════════════════════════════════════════════════════════════════════════════════
describe("Method Not Allowed", () => {
  test("trả về 405 cho PUT", async () => {
    getServerSession.mockResolvedValue(loggedIn);
    const { req, res } = mockReqRes("PUT", {});
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
