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
        """Insert product group to DB using identity_key for uniqueness"""
        if not group:
            return
        
        rep = group[0]
        
        try:
            name = rep.get("name")
            brand = rep.get("brand_norm", "").lower().replace(" ", "_")
            model = rep.get("model_key", "").lower().replace(" ", "_")
            variant = rep.get("variant_key", "").lower().replace(" ", "_")
            description = rep.get("description")
            image_url = rep.get("image_url")
            
            # Generate identity_key from brand + model + variant
            if not (brand and model and variant):
                print(f"⚠️ Skip product (incomplete identity): {name}")
                return
            
            identity_key = f"{brand}_{model}_{variant}"
            
            # Get min price from group
            prices = [p.get("price") for p in group if p.get("price") is not None]
            current_price = min(prices) if prices else None
            
            # Insert or update product by identity_key (UNIQUE)
            # Always keep the minimum price across all shops
            self.cursor.execute("""
                INSERT INTO product (identity_key, name, description, image_url, brand, current_price)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    current_price = CASE 
                        WHEN product.current_price IS NULL THEN VALUES(current_price)
                        ELSE LEAST(product.current_price, VALUES(current_price))
                    END,
                    description = VALUES(description),
                    image_url = VALUES(image_url)
            """, (identity_key, name, description, image_url, brand, current_price))
            
            # Get product_id by identity_key
            self.cursor.execute("""
                SELECT id FROM product WHERE identity_key = %s
            """, (identity_key,))
            result = self.cursor.fetchone()
            product_id = result[0] if result else None
            
            if not product_id:
                print(f"⚠️ Failed to get product_id for: {name}")
                return
            
            # Insert comparison records from all sources in group
            for item in group:
                self._insert_comparison(product_id, item)
        
        except Exception as e:
            print(f"⚠️ Skipped product {rep.get('name')}: {e}")
    
    def _insert_comparison(self, product_id: int, item: Dict):
        """Insert comparison record (price from source) using ON DUPLICATE KEY"""
        try:
            price = item.get("price")
            url = item.get("product_url")
            source = item.get("source", "unknown")
            
            if not (price and url):
                return
            
            # Use ON DUPLICATE KEY to handle existing URLs
            self.cursor.execute("""
                INSERT INTO comparison (product_id, price, url, name)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    product_id = VALUES(product_id),
                    price = VALUES(price),
                    name = VALUES(name)
            """, (product_id, price, url, source))
        
        except Exception as e:
            print(f"⚠️ Failed to insert comparison ({url}): {e}")
    
    def close(self):
        """Flush remaining and close"""
        self.flush()
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        print("✅ DB connection closed")
