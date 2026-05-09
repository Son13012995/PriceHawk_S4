import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import db from "@/pages/api/database";

export const authOptions = {
  providers: [
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
    // Chạy khi tạo/refresh JWT. user chỉ có mặt lần đầu (ngay sau authorize)
    async jwt({ token, user }) {
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
