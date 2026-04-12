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
        <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex min-h-16 flex-wrap items-center gap-4 py-3">

                    {/* Logo Section */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="flex items-center gap-2 group">
                            {/* Dynamic Native Hawk Eye SVG Logo */}
                            {isDark ? (
                                <svg
                                    className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 transition-transform duration-500 group-hover:scale-110"
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
                                    className="w-8 h-8 text-cyan-600 group-hover:text-cyan-500 transition-transform duration-500 group-hover:rotate-12"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                            <span className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-700 to-sky-500 dark:from-cyan-400 dark:to-cyan-200">
                                PriceHawk
                            </span>
                        </Link>
                    </div>

                    <div className="hidden md:block">
                        <PageTabs />
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <Link
                            target="_blank"
                            rel="noopener noreferrer"
                            href="https://github.com/Son13012995/PriceHawk_S4"
                            className="text-slate-500 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-400 text-sm font-semibold transition-colors"
                        >
                            Project Report
                        </Link>
                        <ThemeToggle />
                    </div>

                    {/* Search Section */}
                    <div className="flex-1 max-w-sm w-full lg:max-w-xs ml-auto flex items-center gap-2">
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