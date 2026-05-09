"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme, systemTheme } = useTheme();

    // useEffect only runs on the client, so now we can safely show the UI
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="w-9 h-9" />; // Placeholder to avoid layout shift
    }

    const currentTheme = theme === "system" ? systemTheme : theme;

    return (
        <button
            onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
            className="relative flex items-center w-16 h-8 p-1 rounded-full bg-zinc-200 dark:bg-violet-600 transition-colors overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
            aria-label="Toggle theme"
        >
            {/* Sliding background knob (Empty) */}
            <div
                className={`absolute left-1 w-6 h-6 rounded-full transition-transform duration-200 ease-out shadow-sm z-0 ${currentTheme === "dark"
                        ? 'translate-x-5 bg-zinc-900'
                        : 'translate-x-0 bg-white'
                    }`}
            />
            {/* Stationary Icons placed over the knob */}
            <div className="relative z-10 w-full flex justify-between items-center px-1 pointer-events-none">
                <Sun
                    size={14}
                    className={`transition-colors duration-200 ${currentTheme === "dark" ? "text-zinc-400" : "text-amber-500"}`}
                />
                <Moon
                    size={14}
                    className={`transition-colors duration-200 ${currentTheme === "dark" ? "text-zinc-100" : "text-zinc-500"}`}
                />
            </div>
        </button>
    );
}
