"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    console.log("[LOGIN] Submitting credentials...");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    console.log("[LOGIN] signIn response:", res);

    if (res?.error) {
      console.log("[LOGIN] Failed:", res.error);
      setError("Email hoặc mật khẩu không đúng.");
      return;
    }

    console.log("[LOGIN] Success — redirecting to /");
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white">Đăng nhập</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Chào mừng trở lại PriceHawk</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          {error && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-300 text-white font-bold py-2.5 transition-all active:scale-95"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-semibold text-violet-600 hover:text-violet-500">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
