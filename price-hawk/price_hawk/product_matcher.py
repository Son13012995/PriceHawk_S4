import json

class ProductMatcher:
    def __init__(self, fuzzy_threshold=95):
        # Điểm số tối thiểu để coi phần tên (trước __) là giống nhau
        self.fuzzy_threshold = fuzzy_threshold

    def calculate_match_score(self, prod1, prod2):
        brand1 = prod1.get("brand_norm")
        brand2 = prod2.get("brand_norm")

        if brand1 and brand2:
            if brand1 != brand2:
                return 0
        else:
            return 0  # thiếu brand → loại luôn (cho strict)

        # ==========================================
        # BƯỚC 2: MODEL_KEY (phải giống tuyệt đối)
        # ==========================================
        model1 = prod1.get("model_key")
        model2 = prod2.get("model_key")

        if not model1 or not model2 or model1 != model2:
            return 0

        # ==========================================
        # BƯỚC 3: VARIANT_KEY (phải giống)
        # ==========================================
        var1 = prod1.get("variant_key")
        var2 = prod2.get("variant_key")

        if var1 and var2:
            if var1 != var2:
                return 0  # khác RAM/ROM → tách nhóm
        else:
            return 0  # thiếu variant → cũng loại (strict)

        # ==========================================
        # MATCH 100%
        # ==========================================
        return 100

    def group_products(self, product_pool):
        """Gom nhóm các sản phẩm giống nhau"""
        clusters = []

        for product in product_pool:
            found_cluster = False
            for cluster in clusters:
                representative = cluster[0]
                score = self.calculate_match_score(product, representative)

                # Nếu điểm cuối cùng vẫn đạt chuẩn thì gom chung
                if score >= self.fuzzy_threshold:
                    cluster.append(product)
                    found_cluster = True
                    break

            if not found_cluster:
                clusters.append([product])

        return clusters


def load_jsonl(filepath):
    """Đọc dữ liệu từ file .jsonl"""
    data = []
    try:
        # Thêm encoding utf-8 để không bị lỗi font tiếng Việt
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip(): # Bỏ qua các dòng trống
                    data.append(json.loads(line))
        print(f"✅ Đã tải {len(data)} sản phẩm từ: {filepath}")
    except Exception as e:
        print(f"❌ Lỗi khi đọc file {filepath}: {e}")
    return data

def save_to_json(data, output_path):
    """Lưu kết quả ra file .json để dễ đọc"""
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"✅ Đã lưu kết quả gom nhóm vào: {output_path}")
    except Exception as e:
        print(f"❌ Lỗi khi lưu file: {e}")


# ==========================================
# TEST VỚI DỮ LIỆU JSON CỦA BÁC
# ==========================================
if __name__ == "__main__":
    # Sử dụng raw string (thêm chữ 'r' ở trước) để Python không bị nhầm các dấu '\' trong đường dẫn Windows
    file_tgdd = r"D:\Users\UET\Nam3_Ki2\crawl\data\tgdd_dien-thoai_full.jsonl"
    file_hoangha = r"D:\Users\UET\Nam3_Ki2\crawl\data\hoangha_dien-thoai_full.jsonl"
    output_file = r"D:\Users\UET\Nam3_Ki2\crawl\data\dien-thoai_tablets_results.json"

    # 1. Đọc và gộp dữ liệu thành 1 pool duy nhất
    pool = []
    pool.extend(load_jsonl(file_tgdd))
    pool.extend(load_jsonl(file_hoangha))

    print("-" * 40)
    print(f"Tổng số sản phẩm chuẩn bị xử lý: {len(pool)}")
    print("Đang chạy thuật toán gom nhóm (Matching)...")

    # 2. Chạy thuật toán Matching
    matcher = ProductMatcher(fuzzy_threshold=85)
    grouped_results = matcher.group_products(pool)

    print(f"Hoàn tất! Hệ thống đã gom thành: {len(grouped_results)} nhóm độc lập.")
    print("-" * 40)

    # 3. Lưu kết quả ra file JSON
    save_to_json(grouped_results, output_file)

    # 4. In thử 5 nhóm đầu tiên có nhiều hơn 1 sản phẩm để review nhanh trên terminal
    print("\n--- REVIEW NHANH 5 NHÓM (Khác source) ---")
    count = 0

    for idx, cluster in enumerate(grouped_results):
        if len(cluster) > 1:
            # Lấy danh sách source trong nhóm
            sources = [p.get('source', 'unknown') for p in cluster]
            unique_sources = set(sources)

            # Chỉ lấy nhóm có >= 2 source khác nhau
            if len(unique_sources) > 1:
                print(f"📦 NHÓM {idx + 1} (Số lượng: {len(cluster)}) | Sources: {unique_sources}")

                for p in cluster:
                    source = p.get('source', 'unknown').upper()
                    name = p.get('name', 'No Name')
                    price = p.get('price')

                    # Fix lỗi None
                    price_str = f"{price:,}đ" if isinstance(price, (int, float)) else "N/A"

                    print(f"   - [{source}] {name} - Giá: {price_str}")

                print("-" * 40)

                count += 1
                if count == 5:
                    break