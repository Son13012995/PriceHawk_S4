import db from "@/pages/api/database";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { email, password } = req.body;
  console.log(`[REGISTER] Attempt: ${email}`);

  if (!email || !password) {
    console.log("[REGISTER] Failed: missing email or password");
    return res.status(400).json({ error: "Email và password là bắt buộc" });
  }

  // --- Validation ---
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Email không hợp lệ" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password phải có ít nhất 6 ký tự" });
  }

  // --- Check email đã tồn tại ---
  try {
    const existing = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    if (existing[0]) {
      console.log(`[REGISTER] Failed: duplicate email — ${email}`);
      return res.status(409).json({ error: "Email đã được sử dụng" });
    }

    // --- Hash password (bcryptjs — không phải bcrypt native) ---
    const passwordHash = await bcrypt.hash(password, 10);
    console.log(`[REGISTER] Password hashed for: ${email}`);

    // --- Insert user ---
    const result = await db.query(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'user')",
      [email, passwordHash]
    );

    console.log(`[REGISTER] Success: ${email}`);
    // Không trả password_hash về client
    return res.status(201).json({
      id:    result.insertId,
      email,
      role:  "user",
    });
  } catch (error) {
    console.error("[REGISTER] Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
