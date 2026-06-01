import db from "../../pages/api/database";
import { createServer } from "http";
import handler from "../../pages/api/pagination";
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

describe("Integration: GET /api/pagination", () => {
  test("400 khi thiếu q", async () => {
    const res = await request(server).get("/");
    expect(res.status).toBe(400);
  });

  test("200 trả về data đúng định dạng pagination", async () => {
    db.query.mockResolvedValueOnce([{ count: 15 }]); // count query
    db.query.mockResolvedValueOnce([{ id: 1, name: "iPhone" }]); // data query

    const res = await request(server).get("/?q=iphone&page=2&pageSize=5");
    
    expect(res.status).toBe(200);
    expect(res.body.totalCount).toBe(15);
    expect(res.body.page).toBe(2);
    expect(res.body.pageSize).toBe(5);
    expect(res.body.totalPages).toBe(3);
    expect(res.body.data.length).toBe(1);
    expect(db.query).toHaveBeenCalledTimes(2);
  });
});
