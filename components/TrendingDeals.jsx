"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import SearchCard from "./SearchCard";

export default function TrendingDeals() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTrending() {
            try {
                // Fetch latest 4 products
                const response = await axios.get("/api/product", {
                    params: { page: 1, pageSize: 4 }
                });
                if (response.data && response.data.data) {
                    setProducts(response.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch trending deals", error);
            } finally {
                setLoading(false);
            }
        }
        fetchTrending();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-80 bg-zinc-100 dark:bg-zinc-900 rounded-[24px] animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (!products.length) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
                <div key={product.id} className="h-full">
                    <SearchCard
                        id={product.id}
                        imageUrl={product.image_url}
                        name={product.name}
                        brand={product.brand}
                        currentPrice={product.current_price || product.price}
                    />
                </div>
            ))}
        </div>
    );
}
