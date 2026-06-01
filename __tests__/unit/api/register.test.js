import db from "../../../pages/api/database";
import bcrypt from "bcryptjs";
import handler from "../../../pages/api/auth/register";

jest.mock("../../../pages/api/database", () => ({
  query: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
}));

// Mock console.log/error to keep test output clean
global.console = {
  ...global.console,
  log: jest.fn(),
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

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("405 Method Not Allowed khi không phải POST", async () => {
    const { req, res } = mockReqRes("PUT");
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test("400 khi thiếu email", async () => {
    const { req, res } = mockReqRes("POST", { password: "password123" });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Email và password là bắt buộc" });
  });

  test("400 khi thiếu password", async () => {
    const { req, res } = mockReqRes("POST", { email: "test@example.com" });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("400 khi email sai định dạng", async () => {
    const { req, res } = mockReqRes("POST", { email: "invalid-email", password: "password123" });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Email không hợp lệ" });
  });

  test("400 khi password < 6 ký tự", async () => {
    const { req, res } = mockReqRes("POST", { email: "test@example.com", password: "123" });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Password phải có ít nhất 6 ký tự" });
  });

  test("409 khi email đã tồn tại", async () => {
    db.query.mockResolvedValueOnce([{ id: 1 }]); // Return an existing user

    const { req, res } = mockReqRes("POST", { email: "test@example.com", password: "password123" });
    await handler(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("SELECT id FROM users WHERE email = ? LIMIT 1"), ["test@example.com"]);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: "Email đã được sử dụng" });
  });

  test("201 khi đăng ký thành công", async () => {
    db.query.mockResolvedValueOnce([]); // No existing user
    db.query.mockResolvedValueOnce({ insertId: 99 }); // Insert result
    bcrypt.hash.mockResolvedValueOnce("hashed_password_123");

    const { req, res } = mockReqRes("POST", { email: "test@example.com", password: "password123" });
    await handler(req, res);

    expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
    expect(db.query).toHaveBeenLastCalledWith(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'user')",
      ["test@example.com", "hashed_password_123"]
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: 99,
      email: "test@example.com",
      role: "user",
    });
  });

  test("500 khi DB throw error", async () => {
    db.query.mockRejectedValueOnce(new Error("DB Error"));

    const { req, res } = mockReqRes("POST", { email: "test@example.com", password: "password123" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
  });
});
