import pymysql
import os
from datetime import datetime, timezone
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()


class BatchDBProcessor:
    """Batch process crawled items directly to DB (no file buffering)"""
    
    def __init__(self, batch_size: int = 500, auto_commit: bool = True):
        self.batch_size = batch_size
        self.auto_commit = auto_commit
        self.buffer: List[Dict] = []
        self.conn: Optional[pymysql.Connection] = None
        self.cursor: Optional[pymysql.cursors.Cursor] = None
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
        """Flush buffer to DB"""
        if not self.buffer:
            return True
        
        try:
            # Group by normalize_name (basic matching)
            groups = self._group_items(self.buffer)
            
            for group in groups:
                self._insert_group(group)
            
            if self.auto_commit:
                self.conn.commit()
            
            count = len(self.buffer)
            self.buffer = []
            print(f"✅ Flushed {count} items to DB")
            return True
            
        except Exception as e:
            print(f"❌ Flush failed: {e}")
            self.conn.rollback()
            return False
    
    def _group_items(self, items: List[Dict]) -> List[List[Dict]]:
        """Group items by normalize_name (same product)"""
        groups_dict = {}
        
        for item in items:
            key = (
                item.get("normalize_name", ""),
                item.get("brand", ""),
                item.get("model_key", ""),
                item.get("variant_key", "")
            )
            
            if key not in groups_dict:
                groups_dict[key] = []
            groups_dict[key].append(item)
        
        return list(groups_dict.values())
    
    def _insert_group(self, group: List[Dict]):
        """Insert product group to DB"""
        if not group:
            return
        
        # Representative product (first item)
        rep = group[0]
        
        # Get min price from group
        prices = [item.get("price") for item in group if item.get("price")]
        current_price = min([int(p) if p else 999999 for p in prices]) if prices else None
        
        # Insert product
        try:
            name = rep.get("name")
            brand = rep.get("brand")
            description = rep.get("description")
            image_url = rep.get("image_url")
            
            self.cursor.execute("""
                SELECT id FROM product 
                WHERE name = %s AND brand = %s
            """, (name, brand))
            
            result = self.cursor.fetchone()
            
            if result:
                product_id = result[0]
            else:
                self.cursor.execute("""
                    INSERT INTO product (name, brand, description, image_url, created_at)
                    VALUES (%s, %s, %s, %s, NOW())
                """, (name, brand, description, image_url))
                product_id = self.cursor.lastrowid
            
            # Insert variants and prices
            for item in group:
                self._insert_variant(product_id, item)
        
        except Exception as e:
            print(f"⚠️ Skipped product {rep.get('name')}: {e}")
    
    def _insert_variant(self, product_id: int, item: Dict):
        """Insert variant and price"""
        try:
            ram = item.get("ram")
            rom = item.get("rom")
            color = item.get("color")
            
            # Check if variant exists
            self.cursor.execute("""
                SELECT id FROM product_variant
                WHERE product_id = %s AND ram = %s AND rom = %s
                LIMIT 1
            """, (product_id, ram, rom))
            
            variant = self.cursor.fetchone()
            
            if variant:
                variant_id = variant[0]
            else:
                self.cursor.execute("""
                    INSERT INTO product_variant (product_id, ram, rom, color)
                    VALUES (%s, %s, %s, %s)
                """, (product_id, ram, rom, color))
                variant_id = self.cursor.lastrowid
            
            # Insert price from this source
            price = item.get("price")
            source = item.get("source")
            url = item.get("product_url")
            
            if price and url:
                self.cursor.execute("""
                    SELECT id FROM price_record
                    WHERE variant_id = %s AND source = %s
                    LIMIT 1
                """, (variant_id, source))
                
                existing = self.cursor.fetchone()
                
                if existing:
                    price_id = existing[0]
                    self.cursor.execute("""
                        UPDATE price_record 
                        SET price = %s, url = %s, updated_at = NOW()
                        WHERE id = %s
                    """, (price, url, price_id))
                else:
                    self.cursor.execute("""
                        INSERT INTO price_record (variant_id, source, price, url, updated_at)
                        VALUES (%s, %s, %s, %s, NOW())
                    """, (variant_id, source, price, url))
        
        except Exception as e:
            print(f"⚠️ Failed to insert variant: {e}")
    
    def close(self):
        """Flush remaining and close"""
        self.flush()
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        print("✅ DB connection closed")
