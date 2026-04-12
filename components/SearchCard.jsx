import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function SearchCard({ id, imageUrl, name, brand }) {
    return (
        <Link
            href={`/product/${id}`}
            className="group flex flex-col bg-white dark:bg-slate-900 rounded-[24px] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 dark:hover:shadow-indigo-900/20 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:-translate-y-1.5 transition-all duration-300 h-full relative p-2"
        >
            {/* 1. Nhãn Brand (Sang trọng, có màu tinted) */}
            <div className="absolute top-5 right-5 z-10">
                <span className="bg-indigo-50/95 dark:bg-slate-800/90 backdrop-blur-md text-indigo-700 dark:text-indigo-400 font-bold text-[10px] px-3 py-1.5 rounded-xl shadow-sm border border-indigo-200/50 dark:border-slate-700 uppercase tracking-widest group-hover:bg-indigo-100 dark:group-hover:bg-slate-700 transition-colors">
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
            <div className="px-3 pt-5 pb-2 flex flex-col flex-grow bg-transparent">
                {/* Tên sản phẩm */}
                <h2 className="text-slate-800 dark:text-slate-100 font-bold text-base leading-snug line-clamp-2 mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-cyan-500 dark:group-hover:from-indigo-400 dark:group-hover:to-cyan-400 transition-all duration-300">
                    {name}
                </h2>

                {/* Footer / Call to Action */}
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        So sánh giá
                    </span>

                    {/* Nút mũi tên trang trí bung lụa màu sắc */}
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 flex items-center justify-center group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-cyan-500 group-hover:border-transparent group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all duration-300">
                        <svg className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}