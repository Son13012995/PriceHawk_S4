"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import AppSearchBar from "./ui/AppSearchBar";
import PageTabs from "./ui/PageTabs";
import { ThemeToggle } from "./ThemeToggle";

export default function Navbar() {
    const { theme, systemTheme } = useTheme();
    const { data: session, status } = useSession();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted && (theme === "dark" || (theme === "system" && systemTheme === "dark"));
    const isAuth = status === "authenticated";
    const isLoading = status === "loading";

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-zinc-200/50 dark:border-white/5 bg-white/70 dark:bg-[#0b0712]/70 backdrop-blur-xl transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex min-h-[72px] items-center justify-between gap-8 py-3">
                    
                    {/* Logo Section */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative">
                                {/* Dynamic Native Hawk Eye SVG Logo */}
                                {isDark ? (
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full animate-pulse" />
                                        <svg
                                            className="relative w-10 h-10 text-violet-500 group-hover:text-violet-400 transition-all duration-500 group-hover:scale-110"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9l3 3-3 3-3-3 3-3z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" strokeOpacity="0.3" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                                        </svg>
                                    </div>
                                ) : (
                                    <svg
                                        className="w-10 h-10 text-violet-600 group-hover:text-violet-500 transition-transform duration-300 group-hover:rotate-12"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-black tracking-tight text-zinc-900 dark:text-white leading-none">
                                    PriceHawk
                                </span>
                                <span className="text-[9px] font-bold tracking-[0.25em] text-zinc-400 dark:text-violet-400/60 leading-none mt-1.5 uppercase">
                                    Phantom Intelligence
                                </span>
                            </div>
                        </Link>
                    </div>

                    <div className="hidden lg:block">
                        <PageTabs />
                    </div>

                    {/* Search & Actions Section */}
                    <div className="flex flex-1 items-center justify-end gap-4 max-w-2xl">
                        <div className="w-full max-w-sm xl:max-w-md">
                            <AppSearchBar compact />
                        </div>
                        
                        <div className="hidden md:flex items-center gap-3">
                            <div className="h-6 w-[1px] bg-zinc-200 dark:bg-white/10 mx-2" />
                            <div className="flex-shrink-0">
                                <ThemeToggle />
                            </div>
                            {isLoading ? (
                                <div className="w-24 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                            ) : isAuth ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200 max-w-[180px] truncate overflow-hidden whitespace-nowrap">
                                        {session.user?.email}
                                    </span>
                                    <button
                                        onClick={() => signOut({ callbackUrl: "/" })}
                                        className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm font-semibold transition-all"
                                    >
                                        Đăng xuất
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <Link
                                        href="/login"
                                        className="whitespace-nowrap px-4 py-2 rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-sm font-semibold transition-all"
                                    >
                                        Đăng nhập
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="whitespace-nowrap px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-sm font-bold transition-all shadow-[0_4px_14px_0_rgba(124,58,237,0.39)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.23)] hover:-translate-y-0.5 active:scale-95"
                                    >
                                        Đăng ký
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="md:hidden">
                            <ThemeToggle />
                        </div>
                    </div>

                </div>
                <div className="lg:hidden pb-4 overflow-x-auto">
                    <PageTabs className="flex-nowrap justify-start" />
                </div>
            </div>
        </nav>
    );
}
