import db from "../../pages/api/database";
import { createServer } from "http";
import handler from "../../pages/api/compare";
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

describe("Integration: GET /api/compare", () => {
  test("400 khi thiếu id", async () => {
    const res = await request(server).get("/");
    expect(res.status).toBe(400);
  });

  test("200 trả về product và comparison từ history", async () => {
    db.query.mockImplementation((queryStr) => {
      if (queryStr.includes("FROM product p")) return Promise.resolve([{ id: 1 }]);
      if (queryStr.includes("LEFT JOIN (")) return Promise.resolve([{ id: 10, price: 1000 }]);
      return Promise.resolve([]);
    });

    const res = await request(server).get("/?id=1");
    expect(res.status).toBe(200);
    expect(res.body.product[0].id).toBe(1);
    expect(res.body.comparison[0].price).toBe(1000);
  });

  test("200 trả về product và fallback comparison", async () => {
    db.query.mockImplementation((queryStr) => {
      if (queryStr.includes("FROM product p")) return Promise.resolve([{ id: 1 }]);
      if (queryStr.includes("LEFT JOIN (")) return Promise.resolve([]); // empty history
      if (queryStr.includes("FROM comparison WHERE")) return Promise.resolve([{ id: 20, price: 2000 }]);
      return Promise.resolve([]);
    });

    const res = await request(server).get("/?id=1");
    expect(res.status).toBe(200);
    expect(res.body.product[0].id).toBe(1);
    expect(res.body.comparison[0].price).toBe(2000);
  });
});
