import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import db from "@/pages/api/database";

export const authOptions = {
  providers: [
    // Chỉ đăng ký khi đã có credentials — tránh crash khi env chưa điền
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [GithubProvider({
          clientId:     process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        })]
      : []),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId:     process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        // Guard: thiếu field → reject ngay, không query DB
        if (!credentials?.email || !credentials?.password) {
          console.log("[AUTH] Login failed: missing email or password");
          return null;
        }

        console.log(`[AUTH] Login attempt: ${credentials.email}`);

        // Dùng pool từ database.js — KHÔNG tạo connection mới
        const rows = await db.query(
          "SELECT id, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
          [credentials.email]
        );

        const user = rows?.[0];

        // Email không tồn tại
        if (!user) {
          console.log(`[AUTH] Login failed: email not found — ${credentials.email}`);
          return null;
        }

        // Verify password bằng bcryptjs (không phải bcrypt native — lỗi Docker build)
        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) {
          console.log(`[AUTH] Login failed: wrong password — ${credentials.email}`);
          return null;
        }

        console.log(`[AUTH] Login success: ${credentials.email} (id=${user.id}, role=${user.role})`);

        // Trả object này → NextAuth đưa vào jwt() callback lần đầu
        return {
          id:    String(user.id), // NextAuth yêu cầu id là string
          email: user.email,
          role:  user.role,       // 'guest' | 'user' | 'admin'
        };
      },
    }),
  ],

  session: {
    strategy: "jwt", // stateless — không cần bảng sessions trong DB
  },

  callbacks: {
    // Chạy sau khi provider xác thực xong, trước khi tạo JWT
    // Credential: authorize() đã xử lý — chỉ cần return true
    // OAuth: tìm hoặc tạo user trong DB, gán id + role để jwt() dùng được
    async signIn({ user, account }) {
      // Credential login → không can thiệp gì thêm
      if (account.type === "credentials") {
        return true;
      }

      // OAuth login (github / google)
      const provider          = account.provider;
      const providerAccountId = account.providerAccountId;
      const email             = user.email;

      console.log(`[AUTH] OAuth signIn: provider=${provider}, providerAccountId=${providerAccountId}, email=${email}`);

      // Tìm user theo provider + provider_id (lookup chính xác, không đụng email)
      const byProvider = await db.query(
        "SELECT id, role FROM users WHERE provider = ? AND provider_id = ? LIMIT 1",
        [provider, providerAccountId]
      );

      if (byProvider.length > 0) {
        // User đã từng login bằng OAuth này — gán vào user object để jwt() nhận được
        user.id   = String(byProvider[0].id);
        user.role = byProvider[0].role;
        console.log(`[AUTH] OAuth user found: id=${user.id}, role=${user.role}`);
        return true;
      }

      // Lần đầu login — kiểm tra email conflict với credential user
      const byEmail = await db.query(
        "SELECT id FROM users WHERE email = ? AND provider IS NULL LIMIT 1",
        [email]
      );

      if (byEmail.length > 0) {
        // Email đã dùng bởi credential user → block, không merge tự động
        console.log(`[AUTH] OAuth signIn blocked: email conflict — ${email}`);
        return "/login?error=OAuthEmailConflict";
      }

      // Chưa có user nào → INSERT mới
      // password_hash = NULL hợp lệ sau migration 002
      const result = await db.query(
        `INSERT INTO users (email, password_hash, role, provider, provider_id)
         VALUES (?, NULL, 'user', ?, ?)`,
        [email, provider, providerAccountId]
      );

      user.id   = String(result.insertId);
      user.role = "user";
      console.log(`[AUTH] OAuth user created: id=${user.id}, email=${email}, provider=${provider}`);
      return true;
    },

    // Chạy khi tạo/refresh JWT. user chỉ có mặt lần đầu (ngay sau authorize)
    async jwt({ token, user }) {
      console.log("[jwt callback] token:", token, "user:", user);
      if (user) {
        token.id   = user.id;
        token.role = user.role;
        console.log(`[AUTH] JWT created: id=${user.id}, role=${user.role}`);
      }
      return token;
    },

    // Chạy mỗi khi getServerSession() hoặc useSession() được gọi
    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id;
        session.user.role = token.role;
      }
      console.log(`[AUTH] Session resolved: id=${token.id}, role=${token.role}`);
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
