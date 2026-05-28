/**
 * Integration tests cho GET /api/product
 *
 * Option B: Mock DB — không cần DB thật chạy.
 * Dùng Next.js createServer để test qua HTTP thực sự.
 *
 * Khác với unit test: ở đây ta test toàn bộ HTTP cycle
 * (routing → handler → mock DB → JSON response)
 * bằng cách tạo một HTTP server test thực sự với `supertest`.
 */

jest.mock("../../pages/api/database", () => ({
  query: jest.fn(),
}));

import db from "../../pages/api/database";
import { createServer } from "http";
import handler from "../../pages/api/product";
import request from "supertest";

// Wrap Next.js handler trong một HTTP server đơn giản để supertest gọi được
function createTestServer(handlerFn) {
  return createServer(async (req, res) => {
    // Thêm các hàm helper của Next.js vào res
    res.status = (statusCode) => {
      res.statusCode = statusCode;
      return res;
    };
    res.json = (data) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(data));
    };

    // Parse query string vào req.query (Next.js làm việc này tự động)
    const url = new URL(req.url, "http://localhost");
    req.query = Object.fromEntries(url.searchParams.entries());

    // Parse body nếu là POST
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      if (body) {
        try {
          req.body = JSON.parse(body);
        } catch {
          req.body = {};
        }
      } else {
        req.body = {};
      }
      handlerFn(req, res);
    });
  });
}

let server;
beforeAll(() => {
  server = createTestServer(handler);
});
afterAll(() => server.close());
beforeEach(() => jest.clearAllMocks());

// ── Data giả ─────────────────────────────────────────────────────────────────
const fakeProducts = [
  { id: 1, name: "iPhone 16 Pro Max", brand: "apple", current_price: 33990000, min_price: 32000000, retailer_count: 3 },
  { id: 2, name: "Samsung Galaxy S25 Ultra", brand: "samsung", current_price: 29990000, min_price: 28000000, retailer_count: 2 },
];

// ════════════════════════════════════════════════════════════════════════════════
describe("Integration: GET /api/product (list)", () => {
  test("trả về 200 + data + totalCount", async () => {
    db.query
      .mockResolvedValueOnce([{ total: 50 }])
      .mockResolvedValueOnce(fakeProducts);

    const res = await request(server).get("/api/product?page=1&pageSize=2");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("totalCount", 50);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({ id: 1, brand: "apple" });
  });

  test("dữ liệu trả về có đủ các trường cần thiết", async () => {
    db.query
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([fakeProducts[0]]);

    const res = await request(server).get("/api/product?page=1&pageSize=1");

    const product = res.body.data[0];
    expect(product).toHaveProperty("id");
    expect(product).toHaveProperty("name");
    expect(product).toHaveProperty("current_price");
    expect(product).toHaveProperty("brand");
  });

  test("trả về 500 khi DB lỗi", async () => {
    db.query.mockRejectedValue(new Error("Connection refused"));

    const res = await request(server).get("/api/product?page=1");
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
  });

  test("trả về 405 cho method không hỗ trợ", async () => {
    const res = await request(server).post("/api/product").send({});
    expect(res.status).toBe(405);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
describe("Integration: GET /api/product?id=X (single)", () => {
  test("trả về 200 + product khi tìm thấy", async () => {
    db.query.mockResolvedValue([fakeProducts[0]]);

    const res = await request(server).get("/api/product?id=1");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ id: 1, name: "iPhone 16 Pro Max" });
  });

  test("trả về mảng rỗng khi không tìm thấy id", async () => {
    db.query.mockResolvedValue([]);

    const res = await request(server).get("/api/product?id=9999");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
