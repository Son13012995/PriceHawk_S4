// Server Component — KHÔNG có "use client", KHÔNG dùng useSession()
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authOptions } from "@/lib/auth";
import { cn, ui } from "@/components/ui/designSystem";

export const metadata = { title: "Admin — PriceHawk" };

export default async function AdminPage() {
  // getServerSession(authOptions) — không truyền req/res trong Server Component
  const session = await getServerSession(authOptions);

  // Double-check: middleware đã chặn /admin/* nhưng guard ở đây phòng trường hợp
  // middleware bị bypass hoặc session hết hạn giữa chừng
  if (!session || session.user?.role !== "admin") {
    redirect("/");
  }

  // Forward cookie để /api/admin/users nhận được session
  const requestHeaders = headers();
  const res = await fetch(
    `${process.env.NEXTAUTH_URL}/api/admin/users`,
    {
      cache: "no-store",
      headers: {
        cookie: requestHeaders.get("cookie") ?? "",
      },
    }
  );

  const users = await res.json();

  return (
    <main className={cn(ui.pageWrap, "py-10")}>
      <div className={ui.container}>
        <h1 className={cn(ui.heading, "text-2xl font-bold mb-6")}>
          Quản lý người dùng
          <span className={cn(ui.mutedText, "ml-3 text-base font-normal")}>
            ({Array.isArray(users) ? users.length : 0} tài khoản)
          </span>
        </h1>

        <div className={cn(ui.card, "p-6 overflow-x-auto")}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                {["Email", "Role", "Ngày tạo", "Wishlist", "Alerts"].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      ui.mutedText,
                      "py-3 font-semibold text-left last:text-right"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.isArray(users) && users.map((user) => (
                <tr key={user.id} className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0">
                  <td className="py-3 text-zinc-900 dark:text-zinc-100">{user.email}</td>
                  <td className="py-3">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded-md text-xs font-semibold",
                        user.role === "admin"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      )}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className={cn(ui.mutedText, "py-3")}>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "—"}
                  </td>
                  <td className="py-3 text-right text-zinc-900 dark:text-zinc-100">{user.wishlist_count ?? 0}</td>
                  <td className="py-3 text-right text-zinc-900 dark:text-zinc-100">{user.alert_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {(!Array.isArray(users) || users.length === 0) && (
            <p className={cn(ui.mutedText, "text-center py-10")}>
              Chưa có người dùng nào.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
