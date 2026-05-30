import db from "../../../pages/api/database";
import handler from "../../../pages/api/pagination";

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

describe("GET /api/pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("405 Method Not Allowed khi không phải GET", async () => {
    const { req, res } = mockReqRes("POST");
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test("400 khi thiếu query 'q'", async () => {
    const { req, res } = mockReqRes("GET");
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing search term" });
  });

  test("GET hợp lệ với default page và pageSize", async () => {
    db.query.mockResolvedValueOnce([{ count: 25 }]); // countQuery
    db.query.mockResolvedValueOnce([{ id: 1, name: "iphone" }]); // searchQuery

    const { req, res } = mockReqRes("GET", { q: "iphone" });
    await handler(req, res);

    expect(db.query).toHaveBeenNthCalledWith(1, "SELECT COUNT(*) AS count FROM product WHERE name LIKE ?", ["%iphone%"]);
    expect(db.query).toHaveBeenNthCalledWith(2, "SELECT * FROM product WHERE name LIKE ? LIMIT ? OFFSET ?", ["%iphone%", 10, 0]);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      totalCount: 25,
      page: 1,
      pageSize: 10,
      totalPages: 3,
      data: [{ id: 1, name: "iphone" }],
    });
  });

  test("Tính đúng offset khi truyền page và pageSize", async () => {
    db.query.mockResolvedValueOnce([{ count: 25 }]); // countQuery
    db.query.mockResolvedValueOnce([{ id: 2, name: "iphone" }]); // searchQuery

    const { req, res } = mockReqRes("GET", { q: "iphone", page: "3", pageSize: "5" });
    await handler(req, res);

    expect(db.query).toHaveBeenNthCalledWith(2, "SELECT * FROM product WHERE name LIKE ? LIMIT ? OFFSET ?", ["%iphone%", 5, 10]);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      totalCount: 25,
      page: 3,
      pageSize: 5,
      totalPages: 5,
      data: [{ id: 2, name: "iphone" }],
    });
  });

  test("500 khi DB lỗi", async () => {
    db.query.mockRejectedValueOnce(new Error("DB Error"));

    const { req, res } = mockReqRes("GET", { q: "iphone" });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
  });
});
