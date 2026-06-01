import db from "../../../pages/api/database";
import handler from "../../../pages/api/compare";

jest.mock("../../../pages/api/database", () => ({
  query: jest.fn(),
}));

global.console = {
  ...global.console,
  error: jest.fn(),
};

function mockReqRes(method = "GET", query = {}) {
  const req = { method, query };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe("GET /api/compare", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("405 Method Not Allowed khi không phải GET", async () => {
    const { req, res } = mockReqRes("POST");
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test("400 khi thiếu query 'id'", async () => {
    const { req, res } = mockReqRes("GET");
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing product ID" });
  });

  test("Trả về comparison từ price_history khi historyRows có dữ liệu", async () => {
    const mockProduct = [{ id: 1, name: "iphone", min_price: 1000 }];
    const mockHistory = [{ id: 10, name: "ShopA", price: 1000 }];
    
    // Promise.all in handler calls db.query twice concurrently
    db.query.mockImplementation((queryStr) => {
      if (queryStr.includes("FROM product p")) return Promise.resolve(mockProduct);
      if (queryStr.includes("LEFT JOIN (")) return Promise.resolve(mockHistory);
      return Promise.resolve([]);
    });

    const { req, res } = mockReqRes("GET", { id: "1" });
    await handler(req, res);

    expect(db.query).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      product: mockProduct,
      comparison: mockHistory,
    });
  });

  test("Fallback về bảng comparison gốc khi historyRows rỗng", async () => {
    const mockProduct = [{ id: 1, name: "iphone", min_price: 1000 }];
    const mockFallback = [{ id: 10, name: "ShopA_Fallback", price: 1000 }];
    
    db.query.mockImplementation((queryStr) => {
      if (queryStr.includes("FROM product p")) return Promise.resolve(mockProduct);
      if (queryStr.includes("LEFT JOIN (")) return Promise.resolve([]); // Rỗng
      if (queryStr.includes("FROM comparison WHERE product_id")) return Promise.resolve(mockFallback);
      return Promise.resolve([]);
    });

    const { req, res } = mockReqRes("GET", { id: "1" });
    await handler(req, res);

    expect(db.query).toHaveBeenCalledTimes(3); // Product, History(empty), Fallback
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      product: mockProduct,
      comparison: mockFallback,
    });
  });

  test("500 khi DB lỗi", async () => {
    db.query.mockRejectedValueOnce(new Error("DB Error"));

    const { req, res } = mockReqRes("GET", { id: "1" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
  });
});
