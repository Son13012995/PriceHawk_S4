"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function HeroSearch() {
    const [query, setQuery] = useState("");
    const router = useRouter();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/search/${encodeURIComponent(query.trim())}`);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full flex items-center gap-2">
            <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-zinc-400" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm tên mặt hàng..."
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-zinc-900 dark:text-white placeholder-zinc-500 outline-none text-base sm:text-lg"
                />
            </div>
            <button
                type="submit"
                className="px-6 sm:px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all shadow-md mr-1"
            >
                Tìm kiếm
            </button>
        </form>
    );
}
