"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import useSWR from "swr";
import { checkTriggeredAlerts, getWishlist } from "@/lib/apiClient";
import PageTabs from "./ui/PageTabs";
import { ThemeToggle } from "./ThemeToggle";
import { Download, Origami, User, LogOut } from "lucide-react";

const triggersFetcher = () => checkTriggeredAlerts().then((res) => res.data);

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

    const { data: triggeredData } = useSWR("alerts-triggers", triggersFetcher, {
        refreshInterval: 5000,
        dedupingInterval: 2000,
    });
    const triggeredCount =
        triggeredData?.details?.filter((item) => item.triggered)?.length ?? 0;

    const { data: wishlistData } = useSWR(isAuth ? "wishlist-nav" : null, () => getWishlist().then(res => res.data), {
        refreshInterval: 10000,
        dedupingInterval: 5000,
    });
    const wishlistCount = wishlistData?.data?.length ?? 0;

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
                                        <Origami 
                                            className="relative w-10 h-10 text-violet-500 group-hover:text-violet-400 transition-all duration-500 group-hover:scale-110" 
                                            strokeWidth={1.5} 
                                        />
                                    </div>
                                ) : (
                                    <Origami 
                                        className="w-10 h-10 text-violet-600 group-hover:text-violet-500 transition-transform duration-300 group-hover:rotate-12" 
                                        strokeWidth={1.5} 
                                    />
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
                        <PageTabs badgeCounts={{ "/alerts": triggeredCount, "/wishlist": wishlistCount }} />
                    </div>

                    {/* Search & Actions Section */}
                    <div className="flex flex-1 items-center justify-end gap-4 max-w-2xl">
                        
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="hidden md:block h-6 w-[1px] bg-zinc-200 dark:bg-white/10 mx-2" />
                            <div className="hidden md:block flex-shrink-0">
                                <a 
                                    href="/pricehawk-extension.zip" 
                                    download="PriceHawk_Extension.zip"
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:hover:bg-violet-900/50 dark:text-violet-400 text-sm font-bold transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Tải Extension
                                </a>
                            </div>
                            <div className="flex-shrink-0">
                                <ThemeToggle />
                            </div>
                            {isLoading ? (
                                <div className="w-16 md:w-24 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                            ) : isAuth ? (
                                <div className="flex items-center gap-2 md:gap-3">
                                    <span className="hidden sm:block text-sm font-medium text-zinc-700 dark:text-zinc-200 max-w-[180px] truncate overflow-hidden whitespace-nowrap">
                                        {session.user?.email}
                                    </span>
                                    <button
                                        onClick={() => signOut({ callbackUrl: "/" })}
                                        className="flex items-center justify-center gap-2 px-2.5 py-1.5 md:px-4 md:py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs md:text-sm font-semibold transition-all"
                                        title="Đăng xuất"
                                    >
                                        <LogOut className="w-4 h-4 md:hidden" />
                                        <span className="hidden md:inline">Đăng xuất</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <Link
                                        href="/login"
                                        className="flex items-center justify-center gap-2 whitespace-nowrap px-2.5 py-1.5 md:px-4 md:py-2 rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-xs md:text-sm font-semibold transition-all"
                                        title="Đăng nhập"
                                    >
                                        <User className="w-4 h-4 md:hidden" />
                                        <span className="hidden md:inline">Đăng nhập</span>
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="hidden md:flex whitespace-nowrap px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-sm font-bold transition-all shadow-[0_4px_14px_0_rgba(124,58,237,0.39)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.23)] hover:-translate-y-0.5 active:scale-95"
                                    >
                                        Đăng ký
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
                <div className="lg:hidden pb-4 overflow-x-auto">
                    <PageTabs className="flex-nowrap justify-start" badgeCounts={{ "/alerts": triggeredCount, "/wishlist": wishlistCount }} />
                </div>
            </div>
        </nav>
    );
}
