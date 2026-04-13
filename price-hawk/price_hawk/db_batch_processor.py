import pymysql
import os
from datetime import datetime, timezone
from typing import List, Dict, Optional
from dotenv import load_dotenv
from .product_matcher import ProductMatcher

load_dotenv()


class BatchDBProcessor:
    """Batch process crawled items directly to DB using ProductMatcher for strict grouping"""
    
    def __init__(self, batch_size: int = 500, auto_commit: bool = True):
        self.batch_size = batch_size
        self.auto_commit = auto_commit
        self.buffer: List[Dict] = []
        self.conn: Optional[pymysql.Connection] = None
        self.cursor: Optional[pymysql.cursors.Cursor] = None
        self.matcher = ProductMatcher(fuzzy_threshold=95)  # STRICT matching like import_to_db
        self._init_connection()
    
    def _init_connection(self):
        """Initialize DB connection"""
        try:
            self.conn = pymysql.connect(
                host=os.getenv("MYSQL_HOST", "127.0.0.1"),
                user=os.getenv("MYSQL_USER", "root"),
                password=os.getenv("MYSQL_PASSWORD", ""),
                database=os.getenv("MYSQL_DB", "price_hawk"),
                charset="utf8mb4"
            )
            self.cursor = self.conn.cursor()
            print("✅ DB connection established")
        except Exception as e:
            print(f"❌ DB connection failed: {e}")
            raise
    
    def add_item(self, item: Dict) -> bool:
        """Add item to buffer, flush if batch_size reached"""
        self.buffer.append(item)
        
        if len(self.buffer) >= self.batch_size:
            return self.flush()
        
        return True
    
    def flush(self) -> bool:
        """Flush buffer to DB using ProductMatcher for strict grouping"""
        if not self.buffer:
            return True
        
        try:
            # Use ProductMatcher to strictly group items (same logic as import_to_db)
            groups = self.matcher.group_products(self.buffer)
            
            for group in groups:
                self._insert_group(group)
            
            if self.auto_commit:
                self.conn.commit()
            
            count = len(self.buffer)
            self.buffer = []
            print(f"✅ Flushed {count} items into {len(groups)} groups to DB")
            return True
            
        except Exception as e:
            print(f"❌ Flush failed: {e}")
            self.conn.rollback()
            return False
    
    def _insert_group(self, group: List[Dict]):
        """Insert product group to DB following setup.sql schema
        
        Schema:
        - product: id, name, description, image_url, brand, current_price
        - comparison: id, product_id, price, url, name (source)
        """
        if not group:
            return
        
        rep = group[0]
        
        try:
            name = rep.get("name")
            brand = rep.get("brand_norm")
            description = rep.get("description")
            image_url = rep.get("image_url")
            
            # Get min price from group
            prices = [p.get("price") for p in group if p.get("price") is not None]
            current_price = min(prices) if prices else None
            
            # Try to match by first URL (unique identifier for variant)
            product_id = None
            first_url = group[0].get("product_url") if group else None
            
            if first_url:
                # Check if URL already exists in comparison records
                self.cursor.execute("""
                    SELECT DISTINCT product_id FROM comparison
                    WHERE url = %s
                    LIMIT 1
                """, (first_url,))
                result = self.cursor.fetchone()
                if result:
                    product_id = result[0]
            
            # Fallback: search by name + brand if URL not found
            if not product_id:
                self.cursor.execute("""
                    SELECT id FROM product
                    WHERE name = %s AND brand = %s
                """, (name, brand))
                result = self.cursor.fetchone()
                if result:
                    product_id = result[0]
            
            # If product found, UPDATE it
            if product_id:
                self.cursor.execute("""
                    UPDATE product
                    SET current_price = %s,
                        description = %s,
                        image_url = %s
                    WHERE id = %s
                """, (current_price, description, image_url, product_id))
            else:
                # INSERT new product
                self.cursor.execute("""
                    INSERT INTO product (name, description, image_url, brand, current_price)
                    VALUES (%s, %s, %s, %s, %s)
                """, (name, description, image_url, brand, current_price))
                product_id = self.cursor.lastrowid
            
            # Insert comparison records from all sources in group
            for item in group:
                self._insert_comparison(product_id, item)
        
        except Exception as e:
            print(f"⚠️ Skipped product {rep.get('name')}: {e}")
    
    def _insert_comparison(self, product_id: int, item: Dict):
        """Insert comparison record (price from source)"""
        try:
            price = item.get("price")
            url = item.get("product_url")
            source = item.get("source", "unknown")
            
            if not (price and url):
                return
            
            # Check if comparison record exists for this source
            self.cursor.execute("""
                SELECT id FROM comparison
                WHERE product_id = %s AND url = %s
                LIMIT 1
            """, (product_id, url))
            
            existing = self.cursor.fetchone()
            
            if existing:
                # UPDATE price
                comparison_id = existing[0]
                self.cursor.execute("""
                    UPDATE comparison 
                    SET price = %s
                    WHERE id = %s
                """, (price, comparison_id))
            else:
                # INSERT new comparison
                self.cursor.execute("""
                    INSERT INTO comparison (product_id, price, url, name)
                    VALUES (%s, %s, %s, %s)
                """, (product_id, price, url, source))
        
        except Exception as e:
            print(f"⚠️ Failed to insert comparison: {e}")
    
    def close(self):
        """Flush remaining and close"""
        self.flush()
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        print("✅ DB connection closed")
