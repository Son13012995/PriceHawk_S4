import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = req.nextUrl;

  // --- Bảo vệ /admin/* ---
  // Chưa login → redirect về /login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Đã login nhưng không phải admin → về trang chủ
  if (token.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Admin hợp lệ → đi tiếp
  return NextResponse.next();
}

// Middleware CHỈ chạy trên /admin/*.
// Không khai báo /api/* → wishlist/price-alert giữ nguyên
// anonymous behavior (M04, M05 không bị ảnh hưởng).
export const config = {
  matcher: ["/admin/:path*"],
};
