"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import AppSearchBar from "./ui/AppSearchBar";
import PageTabs from "./ui/PageTabs";
import { ThemeToggle } from "./ThemeToggle";

export default function Navbar() {
    const { theme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted && (theme === "dark" || (theme === "system" && systemTheme === "dark"));

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-white/5 bg-white/80 dark:bg-[#0f0a19]/80 backdrop-blur-md shadow-sm transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex min-h-16 items-center justify-between gap-4 py-3">
                    
                    {/* Logo Section */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative">
                                {/* Dynamic Native Hawk Eye SVG Logo */}
                                {isDark ? (
                                    <svg
                                        className="w-9 h-9 text-violet-500 group-hover:text-violet-400 transition-all duration-300 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9l3 3-3 3-3-3 3-3z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" strokeOpacity="0.5" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                                    </svg>
                                ) : (
                                    <svg
                                        className="w-9 h-9 text-violet-600 group-hover:text-violet-500 transition-transform duration-200 group-hover:rotate-12"
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
                                <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white leading-none">
                                    PriceHawk
                                </span>
                                <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 dark:text-violet-400/80 leading-none mt-1">
                                    S4 EDITION
                                </span>
                            </div>
                        </Link>
                    </div>

                    <div className="hidden md:block">
                        <PageTabs />
                    </div>

                    <div className="hidden md:flex items-center gap-6">
                        <Link
                            target="_blank"
                            rel="noopener noreferrer"
                            href="https://github.com/Son13012995/PriceHawk_S4"
                            className="text-zinc-500 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-white text-sm font-medium transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/product"
                            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-all shadow-lg shadow-violet-600/20 active:scale-95"
                        >
                            Sign Up
                        </Link>
                        <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />
                        <ThemeToggle />
                    </div>

                    {/* Search Section */}
                    <div className="flex items-center gap-2">
                        <AppSearchBar compact />
                        <div className="md:hidden">
                            <ThemeToggle />
                        </div>
                    </div>

                </div>
                <div className="md:hidden pb-3">
                    <PageTabs />
                </div>
            </div>
        </nav>
    );
}