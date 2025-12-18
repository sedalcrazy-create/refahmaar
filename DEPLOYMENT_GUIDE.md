# 🚀 راهنمای Deploy روی سرور

## اطلاعات سرور

- **IP:** 37.152.174.87
- **User:** root
- **Domain:** snake.darmanjoo.ir
- **Bot:** @refahsnakebot
- **Port:** 3001 (داخلی)

## قدم‌های Deploy (سریع)

### 1️⃣ اتصال به سرور

```bash
ssh root@37.152.174.87
```

### 2️⃣ آپلود فایل‌های پروژه

**از کامپیوتر خودتون:**

```bash
# فشرده‌سازی پروژه (بدون node_modules و sample-code)
cd E:/project/marrefah
tar -czf yalda-snake.tar.gz \
  --exclude=node_modules \
  --exclude=sample-code \
  --exclude=.git \
  .

# آپلود به سرور (از PowerShell یا CMD)
scp yalda-snake.tar.gz root@37.152.174.87:/opt/
```

**یا از سرور:**

```bash
# کلون از Git (اگر در Git هست)
cd /opt
git clone <repository-url> yalda-snake
cd yalda-snake
```

### 3️⃣ تنظیم فایل‌ها روی سرور

```bash
cd /opt/yalda-snake

# استخراج فایل (اگر آپلود کردید)
# tar -xzf ../yalda-snake.tar.gz

# کپی و ویرایش .env
cp .env.example .env
nano .env

# مقادیر زیر را تنظیم کنید:
# PORT=3001
# POSTGRES_PASSWORD=<یک رمز قوی>
# NODE_ENV=production
```

### 4️⃣ تنظیم Nginx

```bash
# کپی فایل تنظیمات
cp nginx-snake-darmanjoo.conf /etc/nginx/sites-available/snake.darmanjoo.ir

# فعال‌سازی
ln -s /etc/nginx/sites-available/snake.darmanjoo.ir /etc/nginx/sites-enabled/

# تست Nginx
nginx -t

# Reload
systemctl reload nginx
```

### 5️⃣ تنظیم SSL (اگر قبلاً تنظیم نشده)

```bash
# نصب Certbot (اگر نیست)
apt update
apt install certbot python3-certbot-nginx -y

# دریافت گواهی SSL
certbot --nginx -d snake.darmanjoo.ir
```

### 6️⃣ اجرای Docker

```bash
cd /opt/yalda-snake

# اجرای پروژه
docker-compose up -d --build

# بررسی وضعیت
docker-compose ps
docker-compose logs -f app
```

### 7️⃣ تست

```bash
# تست Health
curl http://localhost:3001/health

# تست از خارج
curl https://snake.darmanjoo.ir/health

# بررسی لاگ‌ها
docker-compose logs -f app
docker-compose logs -f postgres
```

## دستورات مفید

### مدیریت Docker

```bash
# مشاهده لاگ‌ها
docker-compose logs -f app

# ری‌استارت
docker-compose restart app

# توقف
docker-compose down

# شروع مجدد
docker-compose up -d

# پاک‌سازی کامل (با دیتابیس!)
docker-compose down -v
```

### بررسی دیتابیس

```bash
# ورود به PostgreSQL
docker exec -it yalda_snake_db psql -U snake_user -d yalda_snake

# کوئری‌های مفید:
# تعداد کاربران
SELECT COUNT(*) FROM users;

# برترین بازیکنان
SELECT * FROM high_scores ORDER BY high_score DESC LIMIT 10;

# خروج
\q
```

### مشاهده لاگ‌های Nginx

```bash
# لاگ‌های دسترسی
tail -f /var/log/nginx/snake.darmanjoo.ir.access.log

# لاگ‌های خطا
tail -f /var/log/nginx/snake.darmanjoo.ir.error.log
```

## تنظیم Bale Bot

### مینی‌اپ اصلی

1. به @botfather بروید
2. بات @refahsnakebot را انتخاب کنید
3. Bot Settings → Menu Button → Configure menu button
4. URL: `https://snake.darmanjoo.ir`
5. Text: `🎮 بازی یلدا`

### دکمه Inline

از Python SDK بله:

```python
from bale import Bot, InlineKeyboardMarkup, InlineKeyboardButton

bot = Bot(token="64658763:rgYSwBxd05vEuuuNNbNNYZdtA-T1Gxdx5nw")

keyboard = InlineKeyboardMarkup([
    [InlineKeyboardButton(
        text="🎮 شروع بازی یلدا",
        web_app={"url": "https://snake.darmanjoo.ir"}
    )]
])

# ارسال در کانال
bot.send_message(
    chat_id="@your_channel",
    text="🍎 چالش مار یلدایی شروع شد!\n\nیلدا مبارک! 🎉",
    reply_markup=keyboard
)
```

## عیب‌یابی

### مشکل 1: Nginx 502 Bad Gateway

```bash
# بررسی کنید app در حال اجراست
docker-compose ps

# بررسی لاگ
docker-compose logs -f app

# ری‌استارت
docker-compose restart app
```

### مشکل 2: SSL Error

```bash
# بررسی گواهی
certbot certificates

# تمدید گواهی
certbot renew
```

### مشکل 3: Database Connection Error

```bash
# بررسی PostgreSQL
docker-compose logs -f postgres

# ری‌استارت database
docker-compose restart postgres

# بررسی .env
cat .env | grep POSTGRES
```

### مشکل 4: WebSocket Connection Failed

```bash
# بررسی Nginx config
nginx -t

# بررسی port 3001
netstat -tulpn | grep 3001

# تست WebSocket
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  https://snake.darmanjoo.ir/socket.io/
```

## Monitoring

### بررسی وضعیت سرویس‌ها

```bash
# Docker
docker-compose ps

# Nginx
systemctl status nginx

# فضای دیسک
df -h

# مصرف RAM
free -h

# CPU
top
```

### Backup دیتابیس

```bash
# Backup
docker exec yalda_snake_db pg_dump -U snake_user yalda_snake > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i yalda_snake_db psql -U snake_user yalda_snake < backup.sql
```

## تنظیمات بهینه‌سازی

### افزایش حداکثر تعداد بازیکنان

در `.env`:
```bash
MAX_PLAYERS=200  # از 150 به 200
```

سپس:
```bash
docker-compose restart app
```

### تنظیم سرعت بازی

در `.env`:
```bash
GAME_SPEED=15  # سریع‌تر (از 10 به 15)
```

## Auto-Start بعد از ریستارت سرور

```bash
# ایجاد systemd service
nano /etc/systemd/system/yalda-snake.service
```

محتوا:
```ini
[Unit]
Description=Yalda Snake Challenge
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/yalda-snake
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down

[Install]
WantedBy=multi-user.target
```

فعال‌سازی:
```bash
systemctl enable yalda-snake
systemctl start yalda-snake
```

## چک‌لیست قبل از لانچ

- [ ] دامین snake.darmanjoo.ir به سرور متصل است
- [ ] SSL نصب و فعال است
- [ ] Nginx تنظیم و reload شده
- [ ] Docker containers اجرا شده‌اند
- [ ] Health endpoint پاسخ می‌دهد: https://snake.darmanjoo.ir/health
- [ ] بازی از مرورگر باز می‌شود
- [ ] WebSocket اتصال برقرار می‌کند
- [ ] ثبت‌نام کاربر کار می‌کند
- [ ] امتیازها ذخیره می‌شوند
- [ ] Leaderboard نمایش داده می‌شود
- [ ] Bale bot mini-app URL تنظیم شده
- [ ] دکمه بازی در کانال قرار گرفته

## آماده برای مسابقه! 🎉

سرور آماده است. موفق باشید! 🍎🍉🍇
