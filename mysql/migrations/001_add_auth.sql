-- ============================================================
-- PriceHawk S4 — Migration 001: Thêm User Authentication
-- ============================================================
-- Mô tả  : Tạo bảng users, thêm FK từ wishlist/price_alert
-- Ngày   : 09/05/2026
-- Tác giả: PriceHawk Dev Team
--
-- ⚠️  ĐỌC KỸ TRƯỚC KHI CHẠY:
--   1. Backup DB trước (xem hướng dẫn bên dưới)
--   2. Script này AN TOÀN với data cũ — không xóa, không sửa data
--   3. Có thể chạy lại nhiều lần — mỗi bước đều kiểm tra trước khi thêm
--   4. Chạy TỪNG BƯỚC, không chạy toàn bộ một lúc
-- ============================================================


-- ============================================================
-- BƯỚC 0: Kiểm tra trạng thái hiện tại
-- Chạy phần này trước để biết DB đang ở trạng thái nào
-- ============================================================

SELECT 'Kiem tra bang users...' AS step;
SELECT COUNT(*) AS users_table_exists
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'pricecomparison' AND TABLE_NAME = 'users';

SELECT 'Kiem tra FK wishlist...' AS step;
SELECT COUNT(*) AS wishlist_fk_exists
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'pricecomparison'
  AND TABLE_NAME = 'wishlist'
  AND CONSTRAINT_NAME = 'wishlist_user_fk';

SELECT 'Kiem tra FK price_alert...' AS step;
SELECT COUNT(*) AS price_alert_fk_exists
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'pricecomparison'
  AND TABLE_NAME = 'price_alert'
  AND CONSTRAINT_NAME = 'price_alert_user_fk';

-- Kết quả kỳ vọng trước khi chạy migration:
--   users_table_exists    = 0 (chưa có bảng)
--   wishlist_fk_exists    = 0 (chưa có FK)
--   price_alert_fk_exists = 0 (chưa có FK)
--
-- Nếu kết quả = 1 → bước đó đã chạy rồi → BỎ QUA bước đó


-- ============================================================
-- BƯỚC 1: Tạo bảng users
-- Bỏ qua nếu bước 0 cho thấy users_table_exists = 1
-- ============================================================

CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT           NOT NULL AUTO_INCREMENT,
  `email`         VARCHAR(255)  NOT NULL,
  `password_hash` VARCHAR(255)  NOT NULL,
  `role`          ENUM('guest','user','paidUser','admin') NOT NULL DEFAULT 'user',
  `created_at`    TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SELECT 'Buoc 1 xong: bang users da duoc tao.' AS result;


-- ============================================================
-- BƯỚC 2: Dọn dữ liệu orphan trong wishlist
-- (user_id có giá trị nhưng không khớp với users.id nào)
-- ============================================================

SET SQL_SAFE_UPDATES = 0;

UPDATE `wishlist`
SET `user_id` = NULL
WHERE `user_id` IS NOT NULL
  AND `user_id` NOT IN (SELECT `id` FROM `users`);

SET SQL_SAFE_UPDATES = 1;

-- Kiểm tra: số row bị ảnh hưởng phải = 0 nếu data đã sạch
SELECT COUNT(*) AS con_lai_orphan_wishlist
FROM `wishlist`
WHERE `user_id` IS NOT NULL
  AND `user_id` NOT IN (SELECT `id` FROM `users`);

SELECT 'Buoc 2 xong: da don wishlist orphan.' AS result;


-- ============================================================
-- BƯỚC 3: Dọn dữ liệu orphan trong price_alert
-- ============================================================

SET SQL_SAFE_UPDATES = 0;

UPDATE `price_alert`
SET `user_id` = NULL
WHERE `user_id` IS NOT NULL
  AND `user_id` NOT IN (SELECT `id` FROM `users`);

SET SQL_SAFE_UPDATES = 1;

SELECT COUNT(*) AS con_lai_orphan_price_alert
FROM `price_alert`
WHERE `user_id` IS NOT NULL
  AND `user_id` NOT IN (SELECT `id` FROM `users`);

SELECT 'Buoc 3 xong: da don price_alert orphan.' AS result;


-- ============================================================
-- BƯỚC 4: Thêm FK wishlist → users
-- Bỏ qua nếu bước 0 cho thấy wishlist_fk_exists = 1
-- ============================================================

ALTER TABLE `wishlist`
  ADD CONSTRAINT `wishlist_user_fk`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL;

SELECT 'Buoc 4 xong: FK wishlist_user_fk da them.' AS result;


-- ============================================================
-- BƯỚC 5: Thêm FK price_alert → users
-- Bỏ qua nếu bước 0 cho thấy price_alert_fk_exists = 1
-- ============================================================

ALTER TABLE `price_alert`
  ADD CONSTRAINT `price_alert_user_fk`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL;

SELECT 'Buoc 5 xong: FK price_alert_user_fk da them.' AS result;


-- ============================================================
-- BƯỚC 6: Xác nhận kết quả cuối
-- ============================================================

SELECT
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'pricecomparison'
  AND REFERENCED_TABLE_NAME = 'users';

SELECT 'Migration 001 hoan thanh.' AS result;

-- Kết quả kỳ vọng: 2 rows
--   price_alert_user_fk | price_alert | user_id | users | id
--   wishlist_user_fk    | wishlist    | user_id | users | id