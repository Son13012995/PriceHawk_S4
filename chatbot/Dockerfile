# Dockerfile cho PriceHawk Chatbot Service
# Build context: thư mục chatbot/
FROM python:3.11-slim

WORKDIR /app

# Cài system deps cần cho Playwright (Crawl4AI)
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    gnupg \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Copy và cài Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Crawl4AI cần setup Playwright browser (Chromium) lần đầu
RUN crawl4ai-setup || true

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
