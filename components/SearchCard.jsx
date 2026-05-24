import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function SearchCard({ id, imageUrl, name, brand }) {
    return (
        <Link
            href={`/product/${id}`}
            className="group flex flex-col bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:shadow-violet-500/10 dark:hover:shadow-lg dark:hover:shadow-violet-500/10 border border-zinc-100 dark:border-zinc-800/80 hover:border-violet-300 dark:hover:border-violet-800 transition-all duration-200 h-full relative p-3"
        >
            {/* 1. Nhãn Brand (Nổi bật, sáng màu) */}
            <div className="absolute top-5 right-5 z-10">
                <span className="bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 font-bold text-[10px] px-3 py-1.5 rounded-full shadow-sm uppercase tracking-widest">
                    {brand}
                </span>
            </div>

            {/* 2. KHUNG ẢNH (Phân tách rõ ràng thành một khối riêng) */}
            <div className="relative w-full aspect-square bg-zinc-50 dark:bg-zinc-100 rounded-xl flex items-center justify-center overflow-hidden border border-zinc-100 dark:border-zinc-200">
                <Image
                    src={imageUrl}
                    alt={name || 'Product Image'}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-contain p-5 mix-blend-multiply transition-transform duration-200 ease-out group-hover:scale-[1.06]"
                />
            </div>

            {/* 3. KHUNG NỘI DUNG (Khối thông tin bên dưới) */}
            <div className="px-4 pt-6 pb-3 flex flex-col flex-grow bg-transparent gap-4">
                {/* Tên sản phẩm */}
                <h2 className="text-zinc-900 dark:text-zinc-50 font-bold text-lg leading-snug line-clamp-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-200">
                    {name}
                </h2>

                {/* Footer / Call to Action */}
                <div className="mt-auto flex items-center justify-between pt-5 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-200">
                        So sánh giá
                    </span>

                    {/* Nút mũi tên trang trí bung lụa màu sắc */}
                    <div className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center group-hover:bg-violet-600 dark:group-hover:bg-violet-500 group-hover:border-transparent group-hover:shadow-lg group-hover:shadow-violet-500/20 transition-all duration-200 hover:scale-105">
                        <svg className="w-5 h-5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}