import db from "../../pages/api/database";
import bcrypt from "bcryptjs";
import { createServer } from "http";
import handler from "../../pages/api/auth/register";
import request from "supertest";

jest.mock("../../pages/api/database", () => ({
  query: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
}));

global.console = {
  ...global.console,
  log: jest.fn(),
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

describe("Integration: POST /api/auth/register", () => {
  test("400 khi thiếu email", async () => {
    const res = await request(server).post("/").send({ password: "password123" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Email và password là bắt buộc");
  });

  test("400 khi email sai định dạng", async () => {
    const res = await request(server).post("/").send({ email: "invalid", password: "password123" });
    expect(res.status).toBe(400);
  });

  test("409 khi email đã tồn tại", async () => {
    db.query.mockResolvedValueOnce([{ id: 1 }]);
    const res = await request(server).post("/").send({ email: "test@example.com", password: "password123" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Email đã được sử dụng");
  });

  test("201 khi đăng ký thành công", async () => {
    db.query.mockResolvedValueOnce([]); // no duplicate
    db.query.mockResolvedValueOnce({ insertId: 5 }); // insert id
    bcrypt.hash.mockResolvedValueOnce("hashed");

    const res = await request(server).post("/").send({ email: "new@example.com", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 5, email: "new@example.com", role: "user" });
  });
});
