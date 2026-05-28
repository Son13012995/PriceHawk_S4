# Hướng dẫn chạy Test (PriceHawk S4)

Dự án PriceHawk S4 bao gồm 2 môi trường test tách biệt:
1. **Next.js / React (JavaScript)**: Dùng `Jest` và `Supertest` (Frontend & API)
2. **Scrapy Crawler (Python)**: Dùng `Pytest` (Xử lý dữ liệu thu thập)

---

## 1. Test Node.js (Next.js Frontend & API)

Mở terminal tại thư mục gốc của dự án (`PriceHawk_S4`).

### Lệnh chạy cơ bản
```bash
# Chạy TOÀN BỘ Unit Test và Integration Test
npm run test

# Chỉ chạy Unit Test (Test các hàm nhỏ, logic, giao diện UI)
npm run test:unit

# Chỉ chạy Integration Test (Test toàn bộ luồng API, Mock DB)
npm run test:integration
```

### Lệnh chạy khi đang code (Watch mode)
Khi bạn đang sửa code và muốn test tự động chạy lại mỗi khi bấm Save (Ctrl+S):
```bash
npm run test:watch
```

### Xem mức độ bao phủ code (Coverage)
Để biết bạn đã test được bao nhiêu % code trong dự án:
```bash
npm run test:coverage
```
*Kết quả sẽ hiển thị một bảng tóm tắt % số dòng code (Lines), hàm (Functions) đã được chạy qua.*

---

## 2. Test Python (Scrapy Crawler)

Đảm bảo bạn đã mở terminal và di chuyển vào thư mục `price-hawk`, đồng thời cài đặt đầy đủ thư viện:
```bash
cd price-hawk
pip install -r requirements.txt
```

### Lệnh chạy cơ bản
```bash
# Chạy TOÀN BỘ test của Python (Unit & Integration)
python -m pytest
```

### Chạy chi tiết (Verbose mode)
Hiển thị rõ ràng tên từng test case xem PASS hay FAIL:
```bash
python -m pytest -v
```

### Chạy một thư mục hoặc file cụ thể
```bash
# Chỉ chạy Unit test
python -m pytest tests/unit/

# Chỉ chạy Integration test
python -m pytest tests/integration/

# Chỉ chạy test của file normalizer
python -m pytest tests/unit/test_normalizer.py
```

### Chạy một Test cụ thể (theo tên hàm)
Nếu bạn chỉ muốn chạy duy nhất một hàm test (ví dụ hàm `test_extract_memory`):
```bash
python -m pytest -k "test_extract_memory"
```

---

## 3. Quy ước viết Test

*   **JavaScript:** Đặt file trong thư mục `__tests__/unit/` hoặc `__tests__/integration/`. Tên file phải có đuôi `.test.js` hoặc `.test.jsx`.
*   **Python:** Đặt file trong thư mục `price-hawk/tests/unit/` hoặc `price-hawk/tests/integration/`. Tên file phải bắt đầu bằng `test_` (ví dụ `test_logic.py`). Các hàm bên trong cũng phải bắt đầu bằng `test_`.
