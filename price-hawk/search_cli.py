#!/usr/bin/env python3
"""
SearXNG Search Client
- Queries SearXNG self-hosted instance for web search results
- Returns structured results for chatbot to use
"""

import os
import requests
import logging
from typing import List, Dict, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SearXNG endpoint (internal Docker network or external URL)
SEARXNG_URL = os.getenv("SEARXNG_URL", "http://searxng:8080")


def search_web(query: str, num_results: int = 5) -> List[Dict]:
    """
    Search the web using SearXNG self-hosted instance
    
    Args:
        query: Search query string
        num_results: Number of results to return
    
    Returns:
        List of search results with title, url, snippet
    """
    try:
        # SearXNG JSON API endpoint
        url = f"{SEARXNG_URL}/search"
        params = {
            "q": query,
            "format": "json",
            "pageno": 1,
            "results": num_results,
            "language": "vi",  # Vietnamese
        }
        
        logger.info(f"Querying SearXNG: {query}")
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        results = []
        
        # Parse SearXNG results
        for result in data.get("results", [])[:num_results]:
            results.append({
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "snippet": result.get("content", ""),
                "engine": result.get("engine", ""),
            })
        
        logger.info(f"SearXNG returned {len(results)} results for: {query}")
        return results
        
    except requests.exceptions.RequestException as e:
        logger.error(f"SearXNG search error: {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error during search: {e}")
        return []


def search_product_reviews(product_name: str) -> List[Dict]:
    """
    Search for product reviews and detailed information
    
    Args:
        product_name: Product name to search for
    
    Returns:
        List of relevant web results about the product
    """
    query = f"{product_name} review specs price"
    return search_web(query, num_results=3)


def search_price_comparison(product_name: str) -> List[Dict]:
    """
    Search for price comparison information
    
    Args:
        product_name: Product name
    
    Returns:
        List of price comparison results
    """
    query = f"{product_name} giá bán so sánh cửa hàng"
    return search_web(query, num_results=3)


if __name__ == "__main__":
    # Test
    results = search_web("iPhone 15 Pro Max")
    for r in results:
        print(f"✓ {r['title']}")
        print(f"  {r['url']}")
        print(f"  {r['snippet'][:100]}...\n")
