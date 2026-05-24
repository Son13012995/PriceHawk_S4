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

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-zinc-900 px-3 text-zinc-400 dark:text-zinc-500">
                hoặc đăng nhập bằng
              </span>
            </div>
          </div>

          {/* OAuth buttons */}
          <button
            type="button"
            onClick={() => signIn("github", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.42-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.12 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.807 5.625-5.48 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 21.796 24 17.298 24 12c0-6.63-5.37-12-12-12z"/></svg>
            Tiếp tục với GitHub
          </button>
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z"/><path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"/><path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
            Tiếp tục với Google
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
