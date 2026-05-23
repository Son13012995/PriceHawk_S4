import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import { ThemeProvider } from "../components/ThemeProvider";
import ChatWidget from "../components/ChatWidget";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "PriceHawkS4 | So sánh giá đồ điện tử",
    description: "Hệ thống so sánh giá đồ công nghệ thông minh, cập nhật thời gian thực.",
    keywords: ["so sánh giá", "đồ điện tử", "tai nghe", "earbuds", "headphones", "VNU IT"],
};

export default function RootLayout({ children }) {
    return (
        <html lang="vi" className="scroll-smooth" suppressHydrationWarning>
            <body className={`${inter.className} bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 antialiased selection:bg-blue-600 selection:text-white min-h-screen flex flex-col transition-colors`}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <Navbar />
                    <main className="flex-grow w-full">
                        {children}
                    </main>
                    <ChatWidget />
                </ThemeProvider>
            </body>
        </html>
    );
}