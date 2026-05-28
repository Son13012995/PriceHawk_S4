# SearXNG Self-Hosted Integration

## Tổng quan

Chatbot hiện tại hoạt động theo luồng:

```
User Query
  ↓
1. Search Database (MySQL product table)
  ↓
   [If found] → Return DB results + source="database"
  ↓
2. [If not found] Search Web via SearXNG + source="web"
  ↓
   [If found] → Return web results
  ↓
3. [If not found] → Return helpful message
```

## Cấu trúc mới

### docker-compose.yml

- **searxng**: Self-hosted search engine trên port 8080
- **chatbot**: FastAPI app trên port 8000 (gọi SearXNG qua internal network)

### Tệp mới

- **search_cli.py**: Client để gọi SearXNG API
- **chatbot_service.py**: Cập nhật fallback logic

## Khởi động

```bash
cd d:\Code\project_vnu\PriceHawk_S4

# Build và start toàn bộ stack (including SearXNG)
docker compose up -d --build

# Xác nhận tất cả service chạy
docker ps
```

## Test

### 1. Test SearXNG trực tiếp

```bash
curl "http://localhost:8080/search?q=iPhone+15&format=json" | jq '.results[0:2]'
```

### 2. Test Chatbot với DB data

```powershell
$body = @{ message = "tìm iPhone"; history = @() } | ConvertTo-Json -Compress
curl -s -X POST "http://localhost:8000/chat" -H "Content-Type: application/json" -d $body
```

Dự kiến: `"source": "database"` (nếu DB có iPhone)

### 3. Test Chatbot fallback to Web

```powershell
$body = @{ message = "tìm Galaxy Z Fold 7"; history = @() } | ConvertTo-Json -Compress
curl -s -X POST "http://localhost:8000/chat" -H "Content-Type: application/json" -d $body
```

Dự kiến: `"source": "web"` (nếu DB không có, nhưng web có thông tin)

### 4. Test qua Web UI

```
http://localhost:3000
# Click chatbot icon → Gõ câu hỏi → Xem response + source
```

## Logs

```bash
# SearXNG logs
docker logs searxng

# Chatbot logs
docker logs pricehawk_chatbot

# Database logs
docker logs mysql
```

## Điểm cộng

✅ **Tự host**: Không phụ thuộc API bên ngoài  
✅ **Linh hoạt**: Tắt/bật web search bất kỳ lúc nào  
✅ **Nhanh**: Internal Docker network → zero latency  
✅ **Rẻ**: Không tốn API quota hay tiền  
✅ **Kiểm soát**: Full control logs, settings

## Nếu cần config thêm

SearXNG config: `/etc/searxng/settings.yml` inside container

```bash
docker exec searxng cat /etc/searxng/settings.yml
```

Hoặc mount volume cho persistent config:

```yaml
searxng:
  ...
  volumes:
    - ./searxng/settings.yml:/etc/searxng/settings.yml
```
