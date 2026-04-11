# 🚀 Cron Setup Guide - Local Testing + Production Deployment

## 📋 Overview

This guide shows how to test cron locally using Docker, then deploy to production Linux server.

**Files:**
- `run_crawler.sh` - Main wrapper script (works locally & production)
- `docker/` folder - Docker setup for local/team testing (NOT needed on production server)
- `.env` - Environment variables (adjust database connection)

> **📌 Note:** The `docker/` folder is for team collaboration & local testing only. When deploying to production server, use shell cron directly (no Docker needed). See [☑️ Quick Deployment Checklist](#quick-deployment-checklist) below.

---

## 🔬 LOCAL TESTING (Windows with Docker)

### Step 1️⃣: Build Docker image

```bash
cd price-hawk
docker build -f docker/Dockerfile.cron -t pricehawk-cron .
```

### Step 2️⃣: Create crontab script

Create file `setup_cron.sh`:

```bash
#!/bin/bash
# Add cron job inside Docker
echo "0 2 * * * /app/price-hawk/run_crawler.sh skip >> /app/price-hawk/logs/cron.log 2>&1" | crontab -
echo "Cron job added: run crawler daily at 2 AM (--skip-mode)"
crontab -l
```

### Step 3️⃣: Run Docker container with cron

```bash
docker run -it --rm \
  -v D:\Code\project_vnu\PriceHawk_S4\price-hawk:/app/price-hawk \
  --name pricehawk-cron-test \
  pricehawk-cron \
  bash
```

Inside container:

```bash
# Make scripts executable
chmod +x /app/price-hawk/run_crawler.sh

# Setup cron
bash /app/price-hawk/setup_cron.sh

# Monitor cron logs
tail -f /app/price-hawk/logs/cron.log
```

### Step 4️⃣: Verify cron works

```bash
# List cron jobs
crontab -l

# Check cron service
ps aux | grep cron

# Manually test the script
/app/price-hawk/run_crawler.sh skip

# Watch logs
tail -f /app/price-hawk/logs/crawler_*.log
```

---

## 🖥️ PRODUCTION DEPLOYMENT (Linux Server)

### Step 1️⃣: Deploy code

```bash
# Push to Git (including run_crawler.sh)
git add run_crawler.sh
git commit -m "feat: Add cron wrapper script"
git push origin main

# On server (SSH)
cd /home/user/PriceHawk_S4/price-hawk
git pull origin main

# Setup virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create logs directory
mkdir -p logs
```

### Step 2️⃣: Add to crontab

```bash
# SSH to server
ssh user@your-server.com

# Make script executable
chmod +x /home/user/PriceHawk_S4/price-hawk/run_crawler.sh

# Edit crontab
crontab -e

# Add job (runs daily at 2 AM)
0 2 * * * /home/user/PriceHawk_S4/price-hawk/run_crawler.sh skip

# Verify
crontab -l
```

### Step 3️⃣: Monitor

```bash
# Check logs
tail -f /home/user/PriceHawk_S4/price-hawk/logs/crawler_*.log

# Check cron execution
grep CRON /var/log/syslog  # Ubuntu/Debian
```

---

## 📊 Cron Schedule Examples

| Schedule | Crontab | Mode | Use Case |
|----------|---------|------|----------|
| Daily 2 AM | `0 2 * * *` | skip | Default (normal operation) |
| Every 6 hours | `0 */6 * * *` | skip | Frequent updates |
| Every hour | `0 * * * *` | fast | High-frequency crawl |
| Weekdays 2 AM | `0 2 * * 1-5` | skip | Business days only |
| Custom retry | `*/15 * * * *` | default | Quick dev testing |

---

## 🛠️ Troubleshooting

### Cron job not running

```bash
# Check cron service
sudo service cron status  # Ubuntu
sudo systemctl status crond  # CentOS

# Enable if disabled
sudo service cron start
```

### Can't find Python/virtual env

```bash
# Use absolute path to venv
/home/user/PriceHawk_S4/price-hawk/.venv/bin/python

# Or fix in run_crawler.sh
source /home/user/PriceHawk_S4/price-hawk/.venv/bin/activate
```

### No logs appearing

```bash
# Check if logs directory exists
mkdir -p /home/user/PriceHawk_S4/price-hawk/logs

# Redirect cron output
0 2 * * * /home/user/PriceHawk_S4/price-hawk/run_crawler.sh skip >> /home/user/PriceHawk_S4/price-hawk/logs/cron.log 2>&1
```

### Database connection fails

```bash
# Verify .env file exists on server
cat /home/user/PriceHawk_S4/price-hawk/.env

# Make sure DB credentials are correct
# MySQL should be running and accessible
mysql -h localhost -u root -p priceComparison -e "SELECT 1;"
```

---

## 🎯 Summary

**Local Testing:**
```bash
docker build -f docker/Dockerfile.cron -t pricehawk-cron .
docker run -it -v /path/to/price-hawk:/app/price-hawk pricehawk-cron bash
# Inside: ./run_crawler.sh skip
```

**Production:**
```bash
# SSH to server
chmod +x run_crawler.sh
crontab -e
# Add: 0 2 * * * /full/path/run_crawler.sh skip
```

---

## ☑️ Quick Deployment Checklist

**Before pushing to server:**
- [ ] Clone full repo (includes `docker/` for team reference)
- [ ] Server won't use Docker - skip `docker/` folder
- [ ] Server uses shell cron directly

**On production server:**
```bash
git clone <repo> price-hawk
cd price-hawk
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
chmod +x run_crawler.sh

# Add to crontab
crontab -e
# Add: 0 * * * * /full/path/run_crawler.sh default
```

**Team local testing (optional):**
```bash
cd docker
docker-compose up -d
```

---

**Cleanup local (after testing):**
- `docker/` folder stays in repo (team can use anytime)
- Server deployment ignores `docker/` folder - not needed
- Keep `run_crawler.sh` in Git (required everywhere)

---

✅ **Done!** Crawler will now run automatically on schedule.
