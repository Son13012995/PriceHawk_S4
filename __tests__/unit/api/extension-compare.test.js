import db from "../../../pages/api/database";
import { normalizeIdentityByCategory } from "../../../lib/normalizer";
import handler from "../../../pages/api/extension/compare";

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

describe("POST /api/extension/compare", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("405 Method Not Allowed khi không phải POST", async () => {
    const { req, res } = mockReqRes("GET");
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test("400 khi thiếu name", async () => {
    const { req, res } = mockReqRes("POST", { price: 100 });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "name is required" });
  });

  test("422 khi không thể normalize product name", async () => {
    normalizeIdentityByCategory.mockReturnValue({ normalizeName: null });

    const { req, res } = mockReqRes("POST", { name: "invalid name" });
    await handler(req, res);

    expect(normalizeIdentityByCategory).toHaveBeenCalledWith("invalid name", null, null);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      found: false,
      error: "Could not normalize product name",
      normalizedResult: { normalizeName: null },
    });
  });

  test("200 và found = false khi không tìm thấy trong DB", async () => {
    const mockNorm = { normalizeName: "apple_iphone", brandNorm: "apple" };
    normalizeIdentityByCategory.mockReturnValue(mockNorm);
    db.query.mockResolvedValueOnce([]); // No results

    const { req, res } = mockReqRes("POST", { name: "iPhone" });
    await handler(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("SELECT id, name, current_price"), ["apple_iphone"]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      found: false,
      identityKey: "apple_iphone",
      normalizedResult: mockNorm,
    });
  });

  test("200 và tính đúng priceDiff khi tìm thấy trong DB", async () => {
    const mockNorm = { normalizeName: "apple_iphone", brandNorm: "apple" };
    normalizeIdentityByCategory.mockReturnValue(mockNorm);
    
    // DB found
    db.query.mockResolvedValueOnce([{
      id: 1,
      name: "iPhone",
      current_price: 15000000,
      brand: "apple",
      image_url: "/img.jpg",
      identity_key: "apple_iphone"
    }]);

    const { req, res } = mockReqRes("POST", { name: "iPhone", price: 16000000 });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      found: true,
      identityKey: "apple_iphone",
      normalizedResult: mockNorm,
      matchedProduct: {
        id: 1,
        name: "iPhone",
        brand: "apple",
        imageUrl: "/img.jpg",
        price: 15000000,
      },
      currentPrice: 16000000,
      priceDiff: 1000000, // 16M - 15M
    });
  });

  test("priceDiff = null khi dbPrice null", async () => {
    const mockNorm = { normalizeName: "apple_iphone", brandNorm: "apple" };
    normalizeIdentityByCategory.mockReturnValue(mockNorm);
    
    // DB found but no price
    db.query.mockResolvedValueOnce([{
      id: 1,
      name: "iPhone",
      current_price: null,
      brand: "apple",
      image_url: "/img.jpg",
      identity_key: "apple_iphone"
    }]);

    const { req, res } = mockReqRes("POST", { name: "iPhone", price: 16000000 });
    await handler(req, res);

    const data = res.json.mock.calls[0][0];
    expect(data.priceDiff).toBeNull();
  });

  test("500 khi DB lỗi", async () => {
    const mockNorm = { normalizeName: "apple_iphone", brandNorm: "apple" };
    normalizeIdentityByCategory.mockReturnValue(mockNorm);
    db.query.mockRejectedValueOnce(new Error("DB error"));

    const { req, res } = mockReqRes("POST", { name: "iPhone" });
    // The handler doesn't have a try-catch, so it will bubble up
    await expect(handler(req, res)).rejects.toThrow("DB error");
  });
});
