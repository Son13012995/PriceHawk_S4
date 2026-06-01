import db from "../../pages/api/database";
import { createServer } from "http";
import handler from "../../pages/api/price-history";
import request from "supertest";

jest.mock("../../pages/api/database", () => ({
  query: jest.fn(),
}));

global.console = {
  ...global.console,
  error: jest.fn(),
};

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
beforeAll(() => {
  server = createTestServer(handler);
});
afterAll(() => server.close());
beforeEach(() => jest.clearAllMocks());

describe("Integration: GET /api/price-history", () => {
  test("400 khi thiếu id", async () => {
    const res = await request(server).get("/");
    expect(res.status).toBe(400);
  });

  test("200 trả về history trend", async () => {
    db.query.mockImplementation((queryStr) => {
      if (queryStr.includes("DATE(recorded_at)")) {
        return Promise.resolve([
          { day: new Date("2024-05-10"), price: 1000, retailer: "A" }
        ]);
      }
      if (queryStr.includes("this_week_min")) {
        return Promise.resolve([{ this_week_min: 1000, last_week_min: 1200 }]);
      }
      return Promise.resolve([]);
    });

    const res = await request(server).get("/?id=1");
    expect(res.status).toBe(200);
    expect(res.body.history.length).toBe(1);
    expect(res.body.weekChangeTrend).toBe("down"); // 1000 vs 1200
  });

  test("500 khi DB lỗi", async () => {
    db.query.mockRejectedValueOnce(new Error("DB Error"));
    const res = await request(server).get("/?id=1");
    expect(res.status).toBe(500);
  });
});
