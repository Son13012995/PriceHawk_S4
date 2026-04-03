"use client";

import Link from "next/link";
import AppSearchBar from "./ui/AppSearchBar";
import PageTabs from "./ui/PageTabs";

export default function Navbar() {
    return (
        <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm transition-all">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex min-h-16 flex-wrap items-center gap-4 py-3">

                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-700 to-sky-500">
                            PriceHawk
                        </Link>
                    </div>

                    <div className="hidden md:block">
                        <PageTabs />
                    </div>

                    <div className="hidden md:flex items-center">
                        <Link
                            target="_blank"
                            rel="noopener noreferrer"
                            href="https://github.com/Son13012995/PriceHawk_S4"
                            className="text-slate-500 hover:text-cyan-700 text-sm font-semibold transition-colors"
                        >
                            Project Report
                        </Link>
                    </div>

                    <div className="flex-1 max-w-sm w-full lg:max-w-xs ml-auto">
                        <AppSearchBar compact />
                    </div>

                </div>
                <div className="md:hidden pb-3">
                    <PageTabs />
                </div>
            </div>
        </nav>
    );
}