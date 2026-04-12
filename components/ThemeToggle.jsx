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
            className="relative flex items-center w-14 h-8 p-1 rounded-full bg-slate-200 dark:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            aria-label="Toggle theme"
        >
            {/* Sliding background knob (Empty) */}
            <div
                className={`absolute left-1 w-6 h-6 rounded-full transition-transform duration-300 ease-out shadow-sm ${currentTheme === "dark"
                        ? 'translate-x-6 bg-slate-800'
                        : 'translate-x-0 bg-white'
                    }`}
            />
            {/* Stationary Icons placed over the knob */}
            <div className="relative z-10 w-full flex justify-between items-center px-1 pointer-events-none">
                <Sun
                    size={14}
                    className={`transition-colors duration-300 ${currentTheme === "dark" ? "text-slate-400" : "text-amber-500"}`}
                />
                <Moon
                    size={14}
                    className={`transition-colors duration-300 ${currentTheme === "dark" ? "text-cyan-400" : "text-slate-500"}`}
                />
            </div>
        </button>
    );
}
