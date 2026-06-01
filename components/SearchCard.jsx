import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '../app/utils/format';

export default function SearchCard({ id, imageUrl, name, brand, currentPrice }) {
    return (
        <Link
            href={`/product/${id}`}
            className="group flex flex-col bg-white dark:bg-[#18181b] rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_40px_rgba(139,92,246,0.15)] dark:hover:shadow-[0_20px_40px_rgba(139,92,246,0.2)] border border-zinc-200 dark:border-zinc-700/80 hover:-translate-y-2 hover:border-violet-300 dark:hover:border-violet-600 transition-all duration-300 h-full relative z-0 hover:z-10"
        >
            {/* Image Section - Framed White Box for JPEGs */}
            <div className="p-3 pb-0">
                <div className="relative w-full aspect-square bg-white rounded-[16px] flex items-center justify-center overflow-hidden border border-zinc-100 dark:border-zinc-800/30">
                    <Image
                        src={imageUrl || '/default-image.png'}
                        alt={name || 'Product Image'}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        className="object-contain p-6 mix-blend-multiply dark:mix-blend-normal transition-transform duration-500 ease-out group-hover:scale-110"
                    />
                </div>
            </div>

            {/* Content Section */}
            <div className="px-5 pt-5 pb-6 flex flex-col flex-grow bg-transparent">
                {/* Brand */}
                <span className="text-violet-600 dark:text-violet-400 font-bold text-[11px] uppercase tracking-wider mb-2">
                    {brand}
                </span>

                {/* Product Name */}
                <h2 className="text-zinc-800 dark:text-zinc-100 text-[15px] leading-relaxed line-clamp-2 mb-5 font-medium group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-200">
                    {name}
                </h2>

                <div className="mt-auto">
                    {/* Current Price */}
                    <div className="flex items-end justify-between mt-1">
                        <span className="text-orange-500 dark:text-[#f26c27] font-bold text-[22px] tracking-tight leading-none">
                            {currentPrice ? formatPrice(currentPrice) : 'Liên hệ'}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}