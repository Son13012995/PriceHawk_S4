import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function SearchCard({ id, imageUrl, name, brand }) {
    return (
        <Link
            href={`/product/${id}`}
            className="group flex flex-col bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-none border border-slate-100 dark:border-slate-800/80 hover:border-teal-200 dark:hover:border-teal-800 hover:-translate-y-1.5 transition-all duration-300 h-full relative p-3"
        >
            {/* 1. Nhãn Brand (Nổi bật, sáng màu) */}
            <div className="absolute top-5 right-5 z-10">
                <span className="bg-gradient-to-r from-teal-500 to-emerald-400 text-white font-bold text-[10px] px-3 py-1.5 rounded-full shadow-md uppercase tracking-widest">
                    {brand}
                </span>
            </div>

            {/* 2. KHUNG ẢNH (Phân tách rõ ràng thành một khối riêng) */}
            <div className="relative w-full aspect-square bg-slate-50 dark:bg-slate-100 rounded-[16px] flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-200">
                <Image
                    src={imageUrl}
                    alt={name || 'Product Image'}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-contain p-5 mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.12]"
                />
            </div>

            {/* 3. KHUNG NỘI DUNG (Khối thông tin bên dưới) */}
            <div className="px-4 pt-6 pb-3 flex flex-col flex-grow bg-transparent gap-4">
                {/* Tên sản phẩm */}
                <h2 className="text-slate-900 dark:text-white font-bold text-lg leading-snug line-clamp-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors duration-300">
                    {name}
                </h2>

                {/* Footer / Call to Action */}
                <div className="mt-auto flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        So sánh giá
                    </span>

                    {/* Nút mũi tên trang trí bung lụa màu sắc */}
                    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:border-transparent group-hover:shadow-lg group-hover:shadow-teal-500/20 transition-all duration-300 hover:scale-105">
                        <svg className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}