/**
 * Unit tests cho pages/api/product.js
 * Mock DB.
 */

jest.mock("../../../pages/api/database", () => ({
  query: jest.fn(),
}));

import db from "../../../pages/api/database";
import handler from "../../../pages/api/product";

function mockReqRes(query = {}) {
  const req = { method: "GET", query, body: {} };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

beforeEach(() => jest.clearAllMocks());

const fakeProducts = [
  { id: 1, name: "iPhone 16", brand: "apple", current_price: 22000000, min_price: 20000000, retailer_count: 3 },
  { id: 2, name: "Samsung S25", brand: "samsung", current_price: 18000000, min_price: 17000000, retailer_count: 2 },
];

describe("GET /api/product — paginated list", () => {
  test("trả về danh sách sản phẩm có phân trang", async () => {
    db.query
      .mockResolvedValueOnce([{ total: 100 }]) // COUNT query
      .mockResolvedValueOnce(fakeProducts);     // SELECT query

    const { req, res } = mockReqRes({ page: "1", pageSize: "2" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: fakeProducts,
      totalCount: 100,
    });
  });

  test("fallback về page=1 khi không có page param", async () => {
    db.query
      .mockResolvedValueOnce([{ total: 50 }])
      .mockResolvedValueOnce(fakeProducts);

    const { req, res } = mockReqRes({}); // không có page, pageSize
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    // Kiểm tra query thứ 2 có offset=0 (page 1)
    const secondCall = db.query.mock.calls[1];
    expect(secondCall[1]).toEqual([10, 0]); // pageSize=10 (default), offset=0
  });

  test("trả về 500 khi DB lỗi", async () => {
    db.query.mockRejectedValue(new Error("DB unavailable"));
    const { req, res } = mockReqRes({ page: "1" });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("GET /api/product?id=X — single product", () => {
  test("trả về product đúng khi tìm theo id", async () => {
    db.query.mockResolvedValue([fakeProducts[0]]);

    const { req, res } = mockReqRes({ id: "1" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([fakeProducts[0]]);
  });

  test("trả về mảng rỗng khi không tìm thấy id", async () => {
    db.query.mockResolvedValue([]);
    const { req, res } = mockReqRes({ id: "9999" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });
});

describe("Method Not Allowed", () => {
  test("trả về 405 cho POST", async () => {
    const req = { method: "POST", query: {}, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
