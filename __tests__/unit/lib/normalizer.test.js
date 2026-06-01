import {
  toAsciiLower,
  normalizePhoneIdentity,
  normalizeLaptopIdentity,
  normalizeTabletIdentity,
  normalizeIdentityByCategory,
} from "../../../lib/normalizer";

describe("normalizer.js - Unit Tests", () => {
  describe("toAsciiLower", () => {
    test("chuyển đúng chuỗi tiếng Việt có dấu", () => {
      expect(toAsciiLower("Điện thoại")).toBe("dien thoai");
    });
    test("xử lý null hoặc empty string", () => {
      expect(toAsciiLower(null)).toBe("");
      expect(toAsciiLower("")).toBe("");
    });
  });

  describe("normalizePhoneIdentity", () => {
    test("chuẩn hóa brand, ram, rom từ chuỗi tiêu chuẩn", () => {
      const res = normalizePhoneIdentity("iPhone 15 Pro 256GB");
      expect(res.brandNorm).toBe("apple");
      expect(res.romNorm).toBe("256g");
      expect(res.normalizeName).toContain("apple_apple-iphone-15-pro");
    });

    test("chuẩn hóa ram/rom từ chuỗi dạng phân số", () => {
      const res = normalizePhoneIdentity("Samsung Galaxy S25 8/256");
      expect(res.brandNorm).toBe("samsung");
      expect(res.ramNorm).toBe("8g");
      expect(res.romNorm).toBe("256g");
    });

    test("infer brand khi tên không chứa brand rõ ràng nhưng brand là alias", () => {
      const res = normalizePhoneIdentity("Redmi Note 12");
      expect(res.brandNorm).toBe("xiaomi");
    });

    test("nhận diện màu sắc", () => {
      const res = normalizePhoneIdentity("iPhone 15 Pro Max 256GB Màu Titanium", "apple");
      expect(res.colorNorm).toBe("titanium");
    });

    test("loại bỏ noise phrases (hàng nhiễu)", () => {
      const res = normalizePhoneIdentity("Điện thoại Samsung S24 Ultra Chính hãng");
      expect(res.modelKey).toBe("samsung-s24-ultra"); // "Điện thoại", "Chính hãng" đã bị bỏ
    });

    test("trả về confidence score hợp lý", () => {
      const res = normalizePhoneIdentity("Oppo Reno 10 5G 8/256GB Xanh");
      // brand + model + rom + ram + color => score cao
      expect(res.confidenceScore).toBeGreaterThan(0.5);
    });
  });

  describe("normalizeLaptopIdentity", () => {
    test("chuẩn hóa brand, ram, rom và loại bỏ từ khóa laptop", () => {
      const res = normalizeLaptopIdentity("Laptop Gaming Dell XPS 15 16GB/512GB");
      expect(res.brandNorm).toBe("dell");
      expect(res.ramNorm).toBe("16g");
      expect(res.romNorm).toBe("512g");
      expect(res.modelKey).toBe("dell-xps-15"); // 'Laptop', 'Gaming' bị bỏ
      expect(res.colorNorm).toBeNull(); // laptop không extract color
    });
  });

  describe("normalizeTabletIdentity", () => {
    test("chuẩn hóa tablet và loại bỏ từ khóa tablet", () => {
      const res = normalizeTabletIdentity("Máy tính bảng iPad Air 5 256GB wifi");
      expect(res.brandNorm).toBe("apple");
      expect(res.romNorm).toBe("256g");
      expect(res.modelKey).toBe("apple-ipad-air-5-wifi"); // "máy tính bảng" bị bỏ
    });
  });

  describe("normalizeIdentityByCategory", () => {
    test("phân luồng category=laptop", () => {
      const res = normalizeIdentityByCategory("Macbook Pro M2 16/512", null, "laptop");
      expect(res.brandNorm).toBe("apple"); // alias macbook -> apple
      expect(res.ramNorm).toBe("16g");
    });

    test("phân luồng category=tablet", () => {
      const res = normalizeIdentityByCategory("Galaxy Tab S9 128GB", "Samsung", "may-tinh-bang");
      expect(res.brandNorm).toBe("samsung");
      expect(res.romNorm).toBe("128g");
    });

    test("fallback về phone khi category null hoặc không khớp", () => {
      const res = normalizeIdentityByCategory("Xiaomi 14 Pro 12/256", null, null);
      expect(res.brandNorm).toBe("xiaomi");
      expect(res.ramNorm).toBe("12g");
    });
  });
});
