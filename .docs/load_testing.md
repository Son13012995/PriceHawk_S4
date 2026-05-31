# PriceHawk — Báo cáo Load Testing & Tối ưu Docker

> Mục đích: Tóm tắt các bước đã thực hiện để kiểm tra khả năng chịu tải của hệ thống, giúp các thành viên trong team nắm được quy trình và kết quả.

---

## 1. Môi trường hệ thống

**Server thật:**
- 1 CPU, 1GB RAM

**Stack:**
```
mysql           — Database
pricecomparison — Main app (Next.js, port 3000)
pricehawk_chatbot — Chatbot API (FastAPI, port 8000)
price_hawk_crawler — Crawler chạy cron 30 phút/lần
searxng         — Search engine nội bộ (port 8083)
```

---

## 2. Những thay đổi đã thực hiện

### 2.1 Thêm Resource Limits vào `docker-compose.yml`

Giới hạn tài nguyên từng container để giả lập đúng spec server thật (1CPU/1GB), tránh trường hợp 1 container ăn hết tài nguyên kéo sập các container còn lại.

```yaml
deploy:
  resources:
    limits:
      cpus: '0.30'
      memory: 300M
    reservations:
      memory: 200M
```

**Phân bổ cuối cùng:**

| Service | CPU limit | RAM limit |
|---|---|---|
| mysql | 0.30 | 300MB |
| main | 0.25 | 200MB |
| chatbot | 0.25 | 256MB |
| searxng | 0.15 | 150MB |
| crawler | không đụng | không đụng |
| **Tổng** | **0.95** | **~906MB** |

### 2.2 Tối ưu MySQL

Mặc định MySQL tự lấy RAM không kiểm soát. Thêm vào `command`:

```yaml
command: >
  --max_connections=30
  --innodb_buffer_pool_size=128M
  --tmp_table_size=16M
  --max_heap_table_size=16M
```

| Tham số | Ý nghĩa |
|---|---|
| `max_connections=30` | Giảm từ mặc định 151, mỗi connection tốn ~1MB RAM |
| `innodb_buffer_pool_size=128M` | Giới hạn cache của MySQL |
| `tmp_table_size / max_heap_table_size` | Giới hạn bộ nhớ cho temporary tables |

### 2.3 Giảm SearXNG workers

```yaml
SEARXNG_UWSGI_WORKERS=2  # Giảm từ 4 xuống 2, mỗi worker tốn ~30-50MB RAM
```

### 2.4 Thêm Network Alias cho Chatbot

Docker DNS không resolve được hostname có dấu `_`. Thêm alias để k6 gọi được:

```yaml
chatbot:
  networks:
    mynetwork:
      aliases:
        - chatbot   # k6 gọi http://chatbot:8000/ thay vì pricehawk_chatbot
```

### 2.5 Thêm Health Check endpoint vào Main App

Tạo file `app/api/health/route.js`:

```javascript
export async function GET() {
  return Response.json({ status: 'ok' });
}
```

Docker dùng endpoint này để biết app có thực sự hoạt động không (khác với chỉ "đang chạy").

---

## 3. Cấu trúc file test

```
PriceHawk_S4/
├── docker-compose.yml
├── docker-compose.test.yml    ← file chạy k6
├── k6/
│   ├── test.js                ← script test
│   └── results/
│       └── result.json        ← kết quả xuất ra sau khi test
```

### `docker-compose.test.yml`

```yaml
services:
  k6:
    image: grafana/k6
    volumes:
      - ./k6:/scripts
      - ./k6/results:/results
    command: run --out json=/results/result.json /scripts/test.js
    deploy:
      resources:
        limits:
          cpus: '0.20'
          memory: 128M
    networks:
      mynetwork:
        aliases:
          - k6

networks:
  mynetwork:
    external: true
    name: pricehawk_s4_mynetwork
```

### `k6/test.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Tăng dần lên 20 user
    { duration: '1m',  target: 50 },   // Giữ 50 user trong 1 phút
    { duration: '30s', target: 0 },    // Giảm về 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],  // 95% request phải < 800ms
    http_req_failed:   ['rate<0.02'],  // Tỷ lệ lỗi < 2%
  },
};

export default function () {
  const main = http.get('http://pricecomparison:3000/api/product');
  check(main, { 'main OK': (r) => r.status < 500 });

  const chatbot = http.get('http://chatbot:8000/');
  check(chatbot, { 'chatbot OK': (r) => r.status === 200 });

  sleep(1);
}
```

---

## 4. Cách chạy test

```bash
# Bước 1 — Tạo thư mục kết quả (chỉ cần làm 1 lần)
mkdir k6/results

# Bước 2 — Khởi động app
docker compose up -d

# Bước 3 — Xem RAM/CPU realtime (mở terminal riêng)
docker stats

# Bước 4 — Chạy load test
docker compose -f docker-compose.test.yml up
```

> ⚠️ **Lưu ý Windows:** Lệnh `watch` không dùng được trên PowerShell, thay bằng `docker stats` (tự cập nhật liên tục).

---

## 5. Kết quả

**Điều kiện test:** 50 user đồng thời, chạy trong 2 phút, môi trường local giới hạn đúng spec server thật (1CPU/1GB).

```
checks_succeeded : 100%     (6244/6244)
checks_failed    : 0%
http_req_failed  : 0%       (0/6244)
http_req_duration: avg=5.69ms  p(95)=7.16ms  max=1.11s
data_received    : 18MB
iterations       : 3122
```

**Chi tiết từng service:**

| Service | Kết quả | Ghi chú |
|---|---|---|
| main (Next.js) | ✅ 100% pass | Không có request nào lỗi |
| chatbot (FastAPI) | ✅ 100% pass | Không có request nào lỗi |

**Đánh giá:**

| Chỉ số | Kết quả | Ngưỡng | Đánh giá |
|---|---|---|---|
| `p(95)` | 7.16ms | < 800ms | ✅ Xuất sắc |
| `http_req_failed` | 0% | < 2% | ✅ Xuất sắc |
| `max response` | 1.11s | — | ✅ Chấp nhận được |

---

## 6. Cloudflare Setup

### Mục đích
Cloudflare đóng vai trò lớp bảo vệ phía trước VPS:

```
User → Cloudflare → VPS (103.107.183.250) → Docker containers
         (CDN, DDoS, Rate limit, HTTPS)
```

### Thông tin
- **Domain:** price-hawk.store
- **VPS IP:** 103.107.183.250
- **Nameservers:**
  ```
  darl.ns.cloudflare.com
  joselyn.ns.cloudflare.com
  ```

### DNS Records

| Type | Name | IP | Proxy |
|---|---|---|---|
| A | `price-hawk.store` | `103.107.183.250` | 🟠 Proxied |
| A | `www.price-hawk.store` | `103.107.183.250` | 🟠 Proxied |

### Các tính năng đã bật

**SSL/TLS:**
- Mode: **Full**
- Always Use HTTPS: **ON**

**Rate Limiting Rule — "Basic rate limit":**

| Mục | Giá trị |
|---|---|
| Áp dụng cho | Tất cả request (`true`) |
| Giới hạn theo | IP |
| Requests | 20 |
| Period | 10 seconds |
| Action | Block |
| Duration | 10 seconds |

Nghĩa là: 1 IP gửi quá 20 request trong 10 giây → bị block 10 giây. Tương đương chặn spam ~120 request/phút từ 1 nguồn.

---

## 8. Lưu ý khi deploy lên server thật

- Kết quả `p(95) = 7ms` là của môi trường local, **không có độ trễ mạng**. Trên server thật sẽ cao hơn tùy vị trí user và Cloudflare cache.
- Nếu `docker stats` thấy RAM tổng vượt **850MB** → crawler đang chạy cùng lúc, chờ nó xong.
- IP container có thể thay đổi sau mỗi lần `docker compose down/up`. Đã fix bằng DNS alias nên không cần lo.
- Nên bật **Cloudflare proxy** cho domain để có thêm lớp cache và DDoS protection miễn phí.

---

## 9. Troubleshooting thường gặp

| Lỗi | Nguyên nhân | Xử lý |
|---|---|---|
| `data_received: 0B` | k6 không cùng network với app | Kiểm tra `networks` trong `docker-compose.test.yml` |
| `chatbot fail` nhưng app chạy bình thường | Tên container có dấu `_` không resolve được | Dùng network alias |
| Container `unhealthy` | Chưa có `/health` endpoint | Thêm route health check vào app |
| `SyntaxError` trong Python | Dùng comment `/*` của JS trong Python | Xóa `/*`, chỉ giữ string |