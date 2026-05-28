// jest.setup.js — Chạy một lần trước toàn bộ test suite

// Thêm custom matchers cho DOM (toBeInTheDocument, toHaveClass, ...)
import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;


// Mock các biến môi trường cần thiết cho API routes
process.env.DB_HOST = "localhost";
process.env.DB_USER = "test_user";
process.env.DB_PASSWORD = "test_pass";
process.env.DB_NAME = "pricecomparison_test";
process.env.NEXTAUTH_SECRET = "test_secret_for_jest_only";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NODE_ENV = "test";
