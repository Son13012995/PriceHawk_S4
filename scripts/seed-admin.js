// CommonJS — chạy bằng `node` thuần, không dùng ES import, không dùng @/ alias

// Tải .env.local cho DB credentials khi chạy ngoài Next.js context
// Node 20+: node --env-file=.env.local scripts/seed-admin.js <email> <pass>
// Hoặc nếu dotenv có trong project:
try {
  require("dotenv").config({ path: ".env.local" });
} catch (_) {
  // dotenv không bắt buộc — có thể set env vars thủ công trước khi chạy
}

const bcrypt = require("bcryptjs");
// Relative từ scripts/ → project root → pages/api/database
const db = require("../pages/api/database");

async function main() {
  const email    = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Thieu tham so.");
    console.error("   Usage: node scripts/seed-admin.js <email> <password>");
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("Password phai co it nhat 6 ky tu.");
    process.exit(1);
  }

  console.log(`Dang tao admin: ${email} ...`);

  const passwordHash = await bcrypt.hash(password, 10);

  // ON DUPLICATE KEY UPDATE: nếu email đã tồn tại → nâng role lên admin
  // và cập nhật password mới. Idempotent — chạy lại không lỗi.
  await db.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES (?, ?, 'admin')
     ON DUPLICATE KEY UPDATE
       role          = 'admin',
       password_hash = VALUES(password_hash)`,
    [email, passwordHash]
  );

  console.log(`Admin seeded thanh cong: ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Loi:", err.message);
  process.exit(1);
});
