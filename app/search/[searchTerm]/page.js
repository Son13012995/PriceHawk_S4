"use client";

import ProductBrowser from "../../../components/ProductBrowser";

export default function SearchResultsPage({ params }) {
  return <ProductBrowser searchTerm={params.searchTerm} />;
}