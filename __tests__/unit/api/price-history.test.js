import db from "../../../pages/api/database";
import handler from "../../../pages/api/price-history";

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

describe("GET /api/price-history", () => {
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

  test("500 khi DB lỗi", async () => {
    db.query.mockRejectedValueOnce(new Error("DB Error"));
    const { req, res } = mockReqRes("GET", { id: "1" });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Internal Server Error",
      detail: "DB Error",
    });
  });

  test("Trả về đúng cấu trúc khi rawRows rỗng", async () => {
    db.query.mockResolvedValue([]); // Returns empty for both queries

    const { req, res } = mockReqRes("GET", { id: "1" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      history: [],
      weekChangePercent: null,
      weekChangeTrend: "stable",
      minPrice: null,
      maxPrice: null,
    });
  });

  test("Group chính xác nhiều rows cùng ngày và tính min/max", async () => {
    // MySQL DATE() can return string "YYYY-MM-DD" or Date object. We'll use Date object to test JS grouping logic.
    const date1 = new Date("2024-05-10T00:00:00Z");
    const rawRows = [
      { day: date1, price: 1000, retailer: "Shop A" },
      { day: date1, price: 1500, retailer: "Shop B" },
      { day: date1, price: 800, retailer: "Shop C" }, // min price today
      { day: "2024-05-09", price: 2000, retailer: "Shop D" }, // test string fallback
    ];
    
    const weekChangeRows = [{ this_week_min: 800, last_week_min: 800 }];

    db.query.mockImplementation((queryStr) => {
      if (queryStr.includes("SELECT\n        DATE(recorded_at) AS day")) return Promise.resolve(rawRows);
      if (queryStr.includes("this_week_min")) return Promise.resolve(weekChangeRows);
      return Promise.resolve([]);
    });

    const { req, res } = mockReqRes("GET", { id: "1" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0];

    // history length should be 2 because we have 2 distinct days
    expect(data.history.length).toBe(2);
    
    // Sort logic should put newer date first. "2024-05-10" > "2024-05-09"
    expect(data.history[0].day).toBe("2024-05-10");
    expect(data.history[0].minPrice).toBe(800);
    expect(data.history[0].maxPrice).toBe(1500);
    expect(data.history[0].bestRetailer).toBe("Shop C");

    expect(data.history[1].day).toBe("2024-05-09");
    
    // global min/max
    expect(data.minPrice).toBe(800);
    expect(data.maxPrice).toBe(2000);
    
    // Trend stable (800 vs 800 -> 0% change)
    expect(data.weekChangePercent).toBe(0);
    expect(data.weekChangeTrend).toBe("stable");
  });

  test("weekChangeTrend = 'down' khi giá giảm > 0.5%", async () => {
    const rawRows = [];
    const weekChangeRows = [{ this_week_min: 900, last_week_min: 1000 }]; // 10% decrease

    db.query.mockImplementation((queryStr) => {
      if (queryStr.includes("DATE(recorded_at)")) return Promise.resolve(rawRows);
      if (queryStr.includes("this_week_min")) return Promise.resolve(weekChangeRows);
      return Promise.resolve([]);
    });

    const { req, res } = mockReqRes("GET", { id: "1" });
    await handler(req, res);
    
    const data = res.json.mock.calls[0][0];
    expect(data.weekChangePercent).toBe(-10);
    expect(data.weekChangeTrend).toBe("down");
  });

  test("weekChangeTrend = 'up' khi giá tăng > 0.5%", async () => {
    const rawRows = [];
    const weekChangeRows = [{ this_week_min: 1100, last_week_min: 1000 }]; // 10% increase

    db.query.mockImplementation((queryStr) => {
      if (queryStr.includes("DATE(recorded_at)")) return Promise.resolve(rawRows);
      if (queryStr.includes("this_week_min")) return Promise.resolve(weekChangeRows);
      return Promise.resolve([]);
    });

    const { req, res } = mockReqRes("GET", { id: "1" });
    await handler(req, res);
    
    const data = res.json.mock.calls[0][0];
    expect(data.weekChangePercent).toBe(10);
    expect(data.weekChangeTrend).toBe("up");
  });

  test("weekChangePercent = null khi thiếu dữ liệu tuần trước", async () => {
    const rawRows = [];
    const weekChangeRows = [{ this_week_min: 1000, last_week_min: null }];

    db.query.mockImplementation((queryStr) => {
      if (queryStr.includes("DATE(recorded_at)")) return Promise.resolve(rawRows);
      if (queryStr.includes("this_week_min")) return Promise.resolve(weekChangeRows);
      return Promise.resolve([]);
    });

    const { req, res } = mockReqRes("GET", { id: "1" });
    await handler(req, res);
    
    const data = res.json.mock.calls[0][0];
    expect(data.weekChangePercent).toBeNull();
    expect(data.weekChangeTrend).toBe("stable");
  });
});
