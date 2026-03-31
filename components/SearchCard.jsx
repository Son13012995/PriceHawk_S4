import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function SearchCard({ id, imageUrl, name, brand }) {
    return (
        <Link
            href={`/product/${id}`}
            className='group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 h-full'
        >
            {/* KHUNG ẢNH */}
            <div className="relative w-full aspect-square bg-white flex items-center justify-center p-4">
                <Image
                    src={imageUrl}
                    alt={name || 'product-img'}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className='object-contain p-6 transition-transform duration-500 group-hover:scale-110'
                />
            </div>

            {/* KHUNG NỘI DUNG */}
            <div className="p-5 flex flex-col flex-grow border-t border-gray-50 bg-[#fafafa]/50">
                {/* Tên sản phẩm: Đã đổi thành font-medium và text-gray-800 */}
                <h2 className="text-gray-800 font-medium text-base leading-relaxed line-clamp-2 mb-3">
                    {name}
                </h2>

                {/* Brand */}
                <div className="mt-auto pt-3 flex items-center">
                <span className="text-xs text-gray-400 uppercase tracking-widest mr-2">
                    Brand:
                </span>
                    <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                    {brand}
                </span>
                </div>
            </div>
        </Link>
    );
}