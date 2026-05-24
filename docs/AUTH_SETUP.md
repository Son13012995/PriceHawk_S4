# Hướng dẫn thiết lập Authentication — PriceHawk S4

> **Cập nhật lần cuối:** 21/05/2026  
> **Dành cho:** Quản trị viên server  
> **Áp dụng cho:** PriceHawk S4 — NextAuth v4 + bcryptjs + OAuth (GitHub / Google)

---

## Tổng quan

PriceHawk S4 dùng **NextAuth v4** với 3 phương thức đăng nhập:

| Phương thức | Mô tả | Migration cần |
|-------------|-------|---------------|
| Email + Password | Credential login, bcryptjs | `001_add_auth.sql` |
| GitHub OAuth | Đăng nhập qua GitHub | `001` + `002_add_oauth.sql` |
| Google OAuth | Đăng nhập qua Google | `001` + `002_add_oauth.sql` |

**Thứ tự thực hiện bắt buộc:**
1. Chạy migration `001` → Tạo bảng `users`
2. Chạy migration `002` → Thêm OAuth columns
3. Thiết lập biến môi trường
4. Tạo tài khoản admin đầu tiên
5. (Tuỳ chọn) Cấu hình GitHub / Google OAuth App

---

## Bước 0 — Backup trước khi làm bất cứ điều gì

> ⚠️ **Bắt buộc.** Chạy lệnh này trên server trước khi chạy bất kỳ migration nào.

**Môi trường local / Linux:**
```bash
mysqldump -u <DB_USER> -p pricecomparison > backup_pricecomparison_$(date +%Y%m%d_%H%M%S).sql
```

**Môi trường Docker:**
```bash
docker exec <tên_container_mysql> mysqldump -u root -p pricecomparison > backup_$(date +%Y%m%d_%H%M%S).sql
```

Lưu file backup ở nơi an toàn **ngoài** container.

---

## Bước 1 — Migration 001: Tạo bảng `users`

**File:** `mysql/migrations/001_add_auth.sql`  
**Downtime cần thiết:** Không — an toàn với data đang chạy  
**Thời gian dự kiến:** 1–2 phút

### Thay đổi thực hiện

- Tạo bảng `users` (id, email, password_hash, role, created_at)
- Thêm FK `wishlist.user_id → users.id`
- Thêm FK `price_alert.user_id → users.id`
- Các bảng `product`, `comparison`, `wishlist`, `price_alert` **không bị thay đổi data**

### Cách A — MySQLWorkbench

1. Mở file `001_add_auth.sql` trong Workbench
2. Kết nối vào database `pricecomparison`
3. Chạy từng BƯỚC một (có comment đánh dấu rõ từng BƯỚC)
4. Đọc kết quả trả về sau mỗi bước trước khi tiếp tục

### Cách B — Command line

```bash
mysql -u <DB_USER> -p pricecomparison < mysql/migrations/001_add_auth.sql
```

### Xác nhận kết quả Migration 001

Sau khi chạy xong, query này phải trả về 2 rows:

```sql
SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_NAME = 'users'
  AND TABLE_SCHEMA = 'pricecomparison';
```

| CONSTRAINT_NAME | TABLE_NAME | REFERENCED_TABLE_NAME |
|-----------------|------------|----------------------|
| price_alert_user_fk | price_alert | users |
| wishlist_user_fk | wishlist | users |

---

## Bước 2 — Migration 002: Thêm OAuth support

**File:** `mysql/migrations/002_add_oauth.sql`  
**Yêu cầu:** Migration 001 đã chạy thành công  
**Downtime cần thiết:** Không

### Thay đổi thực hiện

| Thay đổi | Lý do |
|----------|-------|
| `password_hash` → `NULL` cho phép | OAuth users không có password |
| Thêm cột `provider VARCHAR(50)` | Lưu tên provider: `github`, `google` |
| Thêm cột `provider_id VARCHAR(255)` | Lưu ID account từ provider |
| Thêm UNIQUE KEY `(provider, provider_id)` | Chống duplicate race condition khi login đồng thời |

> **Lưu ý:** `NULL != NULL` trong MySQL UNIQUE KEY — credential users có `provider = NULL` sẽ **không** xung đột với nhau.

### Chạy Migration 002

```bash
mysql -u <DB_USER> -p pricecomparison < mysql/migrations/002_add_oauth.sql
```

**Hoặc Docker:**
```bash
docker exec -i <tên_container_mysql> mysql -u root -p pricecomparison < mysql/migrations/002_add_oauth.sql
```

### Xác nhận kết quả Migration 002

```sql
DESCRIBE users;
```

Kết quả phải có các cột: `id`, `email`, `password_hash` (Null: **YES**), `role`, `provider`, `provider_id`, `created_at`

---

## Bước 3 — Thiết lập biến môi trường

### 3.1 Tạo NEXTAUTH_SECRET

> ⚠️ **Không được thay đổi** secret sau khi đã có user đăng nhập — thay đổi secret sẽ invalidate toàn bộ session hiện tại.

**Cách A — Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Cách B — OpenSSL (Linux/Mac/WSL):**
```bash
openssl rand -base64 32
```

Copy output, dùng ở bước tiếp theo.

---

### 3.2 Dev local — file `.env.local`

Tạo hoặc mở file `.env.local` ở thư mục gốc project:

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=pricecomparison

# NextAuth — bắt buộc
NEXTAUTH_SECRET=<dán secret vừa tạo vào đây>
NEXTAUTH_URL=http://localhost:3000

# OAuth — GitHub (tuỳ chọn, bỏ trống thì GitHub login bị skip)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# OAuth — Google (tuỳ chọn, bỏ trống thì Google login bị skip)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

### 3.3 Production — file `.env_product`

```env
# Database
DB_HOST=mysql
DB_USER=root
DB_PASSWORD=<mật khẩu production>
DB_PORT=3306
DB_NAME=pricecomparison

# Next.js
NEXT_PUBLIC_API_URL=https://<domain thực tế>
NODE_ENV=production

# NextAuth — bắt buộc
NEXTAUTH_SECRET=<secret production — tạo riêng, KHÁC với dev>
NEXTAUTH_URL=https://<domain thực tế của server>

# OAuth — GitHub
GITHUB_CLIENT_ID=<client id từ GitHub>
GITHUB_CLIENT_SECRET=<client secret từ GitHub>

# OAuth — Google
GOOGLE_CLIENT_ID=<client id từ Google Cloud>
GOOGLE_CLIENT_SECRET=<client secret từ Google Cloud>
```

> ⚠️ **Quan trọng:**
> - `NEXTAUTH_URL` phải khớp **chính xác** với domain đang chạy — sai domain sẽ khiến callback login thất bại
> - Dev và production phải dùng **2 secret khác nhau**
> - **Không commit** `.env.local` hoặc `.env_product` lên git

---

## Bước 4 — Tạo tài khoản Admin đầu tiên

Sau khi biến môi trường đã có, chạy seed script:

```bash
# Dev local
node scripts/seed-admin.js admin@example.com MatKhauManh123

# Production (load env từ file)
node --env-file=.env_product scripts/seed-admin.js admin@example.com MatKhauManh123
```

**Output kỳ vọng:**
```
⏳ Đang tạo admin: admin@example.com ...
✅ Admin seeded thành công: admin@example.com
```

**Verify trong DB:**
```sql
SELECT id, email, role FROM users WHERE email = 'admin@example.com';
-- Kỳ vọng: role = admin
```

---

## Bước 5 — Cấu hình OAuth Apps (tuỳ chọn)

> Bỏ qua bước này nếu chỉ cần đăng nhập email/password. OAuth providers sẽ tự động bị skip khi env trống.

### 5.1 GitHub OAuth App

1. Vào **https://github.com/settings/developers** → **OAuth Apps** → **New OAuth App**
2. Điền thông tin:

| Field | Giá trị dev | Giá trị production |
|-------|-------------|-------------------|
| Application name | PriceHawk Dev | PriceHawk |
| Homepage URL | `http://localhost:3000` | `https://<domain>` |
| Authorization callback URL | `http://localhost:3000/api/auth/callback/github` | `https://<domain>/api/auth/callback/github` |

3. Nhấn **Register application**
4. Copy **Client ID** và generate **Client Secret** → Điền vào `.env.local` / `.env_product`

> ⚠️ **Lưu ý:** Client ID của GitHub bắt đầu bằng **chữ O** (in hoa), không phải số 0. Copy bằng cách bôi đen, không đọc bằng mắt.

---

### 5.2 Google OAuth App

1. Vào **https://console.cloud.google.com/apis/credentials**
2. Tạo project mới (hoặc chọn project có sẵn)
3. **APIs & Services** → **OAuth consent screen** → Chọn **External** → Điền thông tin app
4. **Credentials** → **Create Credentials** → **OAuth Client ID**
5. Application type: **Web application**
6. Thêm Authorized redirect URIs:
   - Dev: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://<domain>/api/auth/callback/google`
7. Copy **Client ID** và **Client Secret** → Điền vào env

---

## Bước 6 — Kiểm tra hoạt động

Sau khi cấu hình xong, test các URL sau:

| Test | URL | Kết quả kỳ vọng |
|------|-----|-----------------|
| Đăng nhập admin | `/login` | Vào được, navbar hiện email |
| Truy cập admin panel | `/admin` | Hiện danh sách users |
| User thường vào `/admin` | `/admin` | Redirect về `/` |
| Chưa login vào `/admin` | `/admin` | Redirect về `/login` |
| Đăng ký tài khoản mới | `/register` | Tạo được, role mặc định = `user` |
| Đăng nhập GitHub | `/login` → nút GitHub | Chuyển sang GitHub → callback về `/` |
| Đăng nhập Google | `/login` → nút Google | Chuyển sang Google → callback về `/` |

---

## Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách fix |
|-----|-------------|----------|
| `client_id is required` | `GITHUB_CLIENT_ID` hoặc `GOOGLE_CLIENT_ID` để trống trong env | Điền đủ credentials hoặc để trống **cả cặp** (ID + Secret) |
| GitHub 404 sau khi click login | Client ID nhập sai ký tự (0 vs O) | Copy Client ID trực tiếp từ trang GitHub |
| `Error 1826: Duplicate foreign key` | FK đã được thêm rồi | Bỏ qua bước đó, tiếp tục bước tiếp theo |
| `Error 1452: Cannot add foreign key` | Có data orphan chưa được dọn | Đảm bảo đã chạy Bước 2 và 3 migration 001 |
| `Error 1175: Safe update mode` | MySQLWorkbench bật safe mode | Chạy `SET SQL_SAFE_UPDATES = 0;` trước |
| `Error 1050: Table already exists` | Bảng `users` đã tồn tại | Bình thường — `IF NOT EXISTS` sẽ bỏ qua |
| `JWT_SESSION_ERROR: decryption operation failed` | Cookie cũ ký bằng secret cũ | Phía user: xóa cookie → login lại. Phía server: kiểm tra `NEXTAUTH_SECRET` có thay đổi không |
| `OAuthEmailConflict` (redirect về `/login?error=OAuthEmailConflict`) | Email đã dùng để đăng ký bằng email/password | Đăng nhập bằng email/password thay vì OAuth |

---

## Rollback nếu có sự cố

### Rollback Migration 002 (OAuth)

```sql
ALTER TABLE users DROP INDEX unique_provider;
ALTER TABLE users DROP COLUMN provider_id;
ALTER TABLE users DROP COLUMN provider;
ALTER TABLE users MODIFY password_hash VARCHAR(255) NOT NULL;
```

### Rollback Migration 001 (Users)

```sql
ALTER TABLE price_alert DROP FOREIGN KEY price_alert_user_fk;
ALTER TABLE wishlist DROP FOREIGN KEY wishlist_user_fk;
DROP TABLE IF EXISTS users;
```

Sau đó restore từ file backup đã tạo ở **Bước 0**.

---

## Docker Deployment

Đảm bảo `docker-compose.yml` truyền đúng env vào container `main`:

```yaml
services:
  main:
    env_file:
      - .env_product
```

Sau khi thay đổi env hoặc chạy migration, restart toàn bộ stack:

```bash
docker-compose down && docker-compose up --build
```

---

## Quản lý Role

| Role | Quyền |
|------|-------|
| `guest` | Xem sản phẩm, so sánh giá (không cần login) |
| `user` | Thêm wishlist, tạo price alert (gắn với tài khoản) |
| `admin` | Truy cập `/admin`, xem danh sách users |

**Nâng role user lên admin qua script:**
```bash
node scripts/seed-admin.js user@example.com MatKhauMoi123
```

**Hoặc trực tiếp trong DB:**
```sql
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

---

## Lưu ý quan trọng

- ❌ **Không thay đổi `NEXTAUTH_SECRET`** khi đang có user — toàn bộ user sẽ bị logout đồng loạt
- ❌ **Không commit** `.env.local`, `.env_product` lên git
- ❌ **Không bỏ qua Migration 002** nếu muốn dùng OAuth — `lib/auth.js` sẽ INSERT với `password_hash = NULL` và lỗi nếu column chưa cho phép NULL
- ✅ **Có thể bỏ trống** `GITHUB_*` và `GOOGLE_*` — app sẽ chạy bình thường với chỉ email/password login
- ✅ **Dev và Production** nên tạo **OAuth App riêng biệt** với callback URL khác nhau

---

> Nếu gặp lỗi không có trong bảng trên, chụp màn hình error và liên hệ dev team trước khi tiếp tục.
