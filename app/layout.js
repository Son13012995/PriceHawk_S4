import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import { ThemeProvider } from "../components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "PriceHawkS4 | So sánh giá đồ điện tử",
    description: "Hệ thống so sánh giá đồ công nghệ thông minh, cập nhật thời gian thực.",
    keywords: ["so sánh giá", "đồ điện tử", "tai nghe", "earbuds", "headphones", "VNU IT"],
};

export default function RootLayout({ children }) {
    return (
        <html lang="vi" className="scroll-smooth" suppressHydrationWarning>
            <body className={`${inter.className} antialiased bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 min-h-screen flex flex-col transition-colors`}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <Navbar />
                    <main className="flex-grow w-full">
                        {children}
                    </main>
                </ThemeProvider>
            </body>
        </html>
    );
}