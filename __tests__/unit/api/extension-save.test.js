import db from "../../../pages/api/database";
import { normalizeIdentityByCategory } from "../../../lib/normalizer";
import handler from "../../../pages/api/extension/save";

jest.mock("../../../pages/api/database", () => ({
  query: jest.fn(),
}));

jest.mock("../../../lib/normalizer", () => ({
  normalizeIdentityByCategory: jest.fn(),
}));

global.console = {
  ...global.console,
  error: jest.fn(),
};

function mockReqRes(method = "POST", body = {}) {
  const req = { method, body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe("POST /api/extension/save", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("405 Method Not Allowed khi không phải POST", async () => {
    const { req, res } = mockReqRes("GET");
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test("400 khi thiếu name", async () => {
    const { req, res } = mockReqRes("POST", { sourceUrl: "http://test.com" });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "name is required" });
  });

  test("400 khi thiếu sourceUrl", async () => {
    const { req, res } = mockReqRes("POST", { name: "iPhone" });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "sourceUrl is required" });
  });

  test("422 khi không thể normalize", async () => {
    normalizeIdentityByCategory.mockReturnValue({ normalizeName: null });

    const { req, res } = mockReqRes("POST", { name: "invalid", sourceUrl: "url" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: "Could not normalize product name" });
  });

  test("200 và duplicate=true khi sản phẩm đã tồn tại", async () => {
    normalizeIdentityByCategory.mockReturnValue({ normalizeName: "apple_iphone", brandNorm: "apple" });
    
    // Duplicate check returns true
    db.query.mockResolvedValueOnce([{ id: 99 }]); 

    const { req, res } = mockReqRes("POST", { name: "iPhone", sourceUrl: "url" });
    await handler(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("SELECT id FROM product WHERE identity_key = ?"), ["apple_iphone"]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      duplicate: true,
      productId: 99,
      identityKey: "apple_iphone",
    });
  });

  test("200 và success=true khi insert thành công", async () => {
    const mockNorm = { normalizeName: "apple_iphone", brandNorm: "apple" };
    normalizeIdentityByCategory.mockReturnValue(mockNorm);
    
    // Duplicate check -> empty
    db.query.mockResolvedValueOnce([]); 
    // Insert product -> ID 100
    db.query.mockResolvedValueOnce({ insertId: 100 });
    // Insert comparison -> success
    db.query.mockResolvedValueOnce({ affectedRows: 1 });

    const { req, res } = mockReqRes("POST", { name: "iPhone", sourceUrl: "http://test.com", price: 1500 });
    await handler(req, res);

    // Assert product insert
    expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining("INSERT INTO product"), ["iPhone", 1500, "apple", "apple_iphone"]);
    // Assert comparison insert
    expect(db.query).toHaveBeenNthCalledWith(3, expect.stringContaining("INSERT INTO comparison"), [100, 1500, "http://test.com", "iPhone"]);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      productId: 100,
      identityKey: "apple_iphone",
      normalizedResult: mockNorm,
    });
  });

  test("500 khi DB lỗi (bubble up)", async () => {
    normalizeIdentityByCategory.mockReturnValue({ normalizeName: "apple_iphone" });
    db.query.mockRejectedValueOnce(new Error("DB error"));

    const { req, res } = mockReqRes("POST", { name: "iPhone", sourceUrl: "url" });
    await expect(handler(req, res)).rejects.toThrow("DB error");
  });
});
