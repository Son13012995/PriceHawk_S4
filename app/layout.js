import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "BudSpot | So sánh giá đồ điện tử",
    description: "Hệ thống so sánh giá đồ công nghệ thông minh, cập nhật thời gian thực.",
    keywords: ["so sánh giá", "đồ điện tử", "tai nghe", "earbuds", "headphones", "VNU IT"],
};

export default function RootLayout({ children }) {
    return (
        <html lang="vi" className="scroll-smooth">
        <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white min-h-screen flex flex-col`}>
        <Navbar />

        <main className="flex-grow w-full">
            {children}
        </main>


        </body>
        </html>
    );
}