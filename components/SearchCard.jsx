import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function SearchCard({ id, imageUrl, name, brand }) {
    return (
        <Link
            href={`/product/${id}`}
            className="group flex flex-col bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-100 dark:hover:shadow-none border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500 hover:-translate-y-1.5 transition-all duration-300 h-full relative"
        >
            {/* 1. Nhãn Brand (Đưa lên góc ảnh cho gọn và sang hơn) */}
            <div className="absolute top-3 right-3 z-10">
                <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-indigo-600 dark:text-indigo-400 font-bold text-xs px-2.5 py-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 uppercase tracking-wider">
                    {brand}
                </span>
            </div>

            {/* 2. KHUNG ẢNH */}
            <div className="relative w-full aspect-square bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-center overflow-hidden">
                <Image
                    src={imageUrl}
                    alt={name || 'Product Image'}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-contain p-6 transition-transform duration-500 ease-out group-hover:scale-[1.15]"
                />
            </div>

            {/* 3. KHUNG NỘI DUNG */}
            <div className="p-5 flex flex-col flex-grow border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                {/* Tên sản phẩm */}
                <h2 className="text-slate-800 dark:text-slate-100 font-semibold text-base leading-snug line-clamp-2 mb-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                    {name}
                </h2>

                {/* Footer / Call to Action */}
                <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        So sánh giá
                    </span>

                    {/* Nút mũi tên trang trí */}
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-slate-600 transition-colors">
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}