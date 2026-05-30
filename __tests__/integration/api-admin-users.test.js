import db from "../../pages/api/database";
import { getServerSession } from "next-auth";
import { createServer } from "http";
import handler from "../../pages/api/admin/users";
import request from "supertest";

jest.mock("../../pages/api/database", () => ({
  query: jest.fn(),
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("../../lib/auth", () => ({
  authOptions: {},
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

describe("Integration: GET /api/admin/users", () => {
  test("401 khi chưa login", async () => {
    getServerSession.mockResolvedValueOnce(null);
    const res = await request(server).get("/");
    expect(res.status).toBe(401);
  });

  test("403 khi login nhưng không phải admin", async () => {
    getServerSession.mockResolvedValueOnce({ user: { role: "user" } });
    const res = await request(server).get("/");
    expect(res.status).toBe(403);
  });

  test("200 và danh sách user khi là admin", async () => {
    getServerSession.mockResolvedValueOnce({ user: { role: "admin" } });
    db.query.mockResolvedValueOnce([{ id: 1, email: "admin@test.com" }]);

    const res = await request(server).get("/");
    expect(res.status).toBe(200);
    expect(res.body[0].email).toBe("admin@test.com");
  });
});
