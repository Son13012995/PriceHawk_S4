-- migrations/002_add_oauth.sql
-- Thêm OAuth support (GitHub + Google) cho bảng users
-- PHẢI chạy migration này TRƯỚC khi deploy lib/auth.js mới
-- Thứ tự ALTER quan trọng — không đảo ngược

-- Bước 1: Cho phép password_hash NULL (OAuth users không có password)
ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL;

-- Bước 2-3: Track OAuth provider để lookup thay vì email
ALTER TABLE users ADD COLUMN provider VARCHAR(50) NULL;

ALTER TABLE users ADD COLUMN provider_id VARCHAR(255) NULL;

-- Bước 4: Ngăn duplicate insert race condition ở tầng DB
-- NULL != NULL trong UNIQUE KEY → credential users (provider=NULL) không xung đột
ALTER TABLE users
ADD UNIQUE KEY unique_provider (provider, provider_id);