/**
 * Unit tests for app/utils/format.js
 * Không cần mock gì — pure functions
 */
import {
  formatPrice,
  formatPriceInput,
  parsePriceInput,
  formatPriceUpdateTime,
} from "@/app/utils/format";

describe("formatPrice()", () => {
  test("formats a standard VND price with dots", () => {
    expect(formatPrice(17190000)).toBe("17.190.000 đ");
  });

  test("formats 1000 correctly", () => {
    expect(formatPrice(1000)).toBe("1.000 đ");
  });

  test("returns '0 đ' for zero", () => {
    expect(formatPrice(0)).toBe("0 đ");
  });

  test("returns '0 đ' for null", () => {
    expect(formatPrice(null)).toBe("0 đ");
  });

  test("returns '0 đ' for undefined", () => {
    expect(formatPrice(undefined)).toBe("0 đ");
  });

  test("returns '0 đ' for non-numeric string", () => {
    expect(formatPrice("abc")).toBe("0 đ");
  });

  test("handles numeric string input", () => {
    expect(formatPrice("5000000")).toBe("5.000.000 đ");
  });

  test("handles floating point — rounds to integer", () => {
    expect(formatPrice(17190000.9)).toBe("17.190.001 đ");
  });
});

describe("formatPriceInput()", () => {
  test("formats a plain number string with dots", () => {
    expect(formatPriceInput("1234567")).toBe("1.234.567");
  });

  test("returns empty string for empty input", () => {
    expect(formatPriceInput("")).toBe("");
  });

  test("returns empty string for null", () => {
    expect(formatPriceInput(null)).toBe("");
  });

  test("strips non-digit characters before formatting", () => {
    // Nếu user paste "1.234.567" → parse lại → format lại
    expect(formatPriceInput("1.234.567")).toBe("1.234.567");
  });

  test("handles numeric input (not string)", () => {
    expect(formatPriceInput(5000000)).toBe("5.000.000");
  });
});

describe("parsePriceInput()", () => {
  test("parses formatted VND string to number", () => {
    expect(parsePriceInput("1.234.567")).toBe(1234567);
  });

  test("returns 0 for empty string", () => {
    expect(parsePriceInput("")).toBe(0);
  });

  test("returns 0 for null", () => {
    expect(parsePriceInput(null)).toBe(0);
  });

  test("strips all non-digit characters", () => {
    expect(parsePriceInput("17,190,000 đ")).toBe(17190000);
  });

  test("handles plain number string", () => {
    expect(parsePriceInput("5000000")).toBe(5000000);
  });
});

describe("formatPriceUpdateTime()", () => {
  test("returns 'Chưa cập nhật' for null", () => {
    expect(formatPriceUpdateTime(null)).toBe("Chưa cập nhật");
  });

  test("returns 'Chưa cập nhật' for undefined", () => {
    expect(formatPriceUpdateTime(undefined)).toBe("Chưa cập nhật");
  });

  test("returns 'Chưa cập nhật' for invalid date string", () => {
    expect(formatPriceUpdateTime("not-a-date")).toBe("Chưa cập nhật");
  });

  test("formats valid ISO timestamp to vi-VN locale", () => {
    const result = formatPriceUpdateTime("2026-05-28T10:00:00.000Z");
    // Kiểm tra định dạng ngày có trong kết quả (locale-dependent)
    expect(result).toMatch(/28\/05\/2026/);
  });
});
