"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn, ui } from "./designSystem";
import { Lock } from "lucide-react";

/**
 * AuthGuard — bọc quanh trang yêu cầu đăng nhập.
 * - Đang load session: hiện skeleton
 * - Chưa đăng nhập: hiện banner + nút chuyển tới /login
 * - Đã đăng nhập: render children bình thường
 *
 * Props:
 *   featureName  — tên tính năng hiển thị trong banner (VD: "Wishlist", "Price Alerts")
 *   children     — nội dung trang thực sự
 */
export default function AuthGuard({ children, featureName = "tính năng này" }) {
  const { status } = useSession();
  const router = useRouter();

  // Đang xác thực — hiện skeleton nhẹ
  if (status === "loading") {
    return (
      <div className={cn(ui.pageWrap, "py-10")}>
        <div className={cn(ui.container, "space-y-6")}>
          <div className={cn(ui.card, "h-48 animate-pulse")} />
          <div className={cn(ui.card, "h-64 animate-pulse")} />
        </div>
      </div>
    );
  }

  // Chưa đăng nhập — hiện overlay thông báo
  if (status === "unauthenticated") {
    return (
      <div className={cn(ui.pageWrap, "py-10")}>
        <div className={cn(ui.container)}>
          <div
            className={cn(
              ui.card,
              "flex flex-col items-center justify-center gap-6 py-24 text-center relative overflow-hidden"
            )}
          >
            {/* Decorative glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-6">
              {/* Icon */}
              <div className="w-20 h-20 rounded-3xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shadow-lg shadow-violet-500/10">
                <Lock className="w-9 h-9 text-violet-600 dark:text-violet-400" />
              </div>

              {/* Text */}
              <div className="space-y-2 max-w-sm">
                <h2 className={cn(ui.heading, "text-2xl font-black")}>
                  Đăng nhập để tiếp tục
                </h2>
                <p className={cn(ui.mutedText, "text-base leading-relaxed")}>
                  Bạn cần đăng nhập để sử dụng{" "}
                  <span className="font-semibold text-violet-600 dark:text-violet-400">
                    {featureName}
                  </span>
                  .
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 flex-wrap justify-center">
                <button
                  onClick={() => router.push("/login")}
                  className={cn(ui.primaryButton, "px-8 py-3 text-base")}
                >
                  Đăng nhập ngay
                </button>
                <button
                  onClick={() => router.push("/")}
                  className={cn(ui.secondaryButton, "px-6 py-3 text-base")}
                >
                  Về trang chủ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Đã đăng nhập — render nội dung thực
  return children;
}
