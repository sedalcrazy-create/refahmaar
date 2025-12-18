# راهنمای کامل راه‌اندازی سرور و تنظیمات MiniApbale

## 📋 فهرست

1. [اطلاعات سرور و SSH](#اطلاعات-سرور-و-ssh)
2. [تنظیمات Docker](#تنظیمات-docker)
3. [تنظیمات Nginx](#تنظیمات-nginx)
4. [تنظیمات دیتابیس](#تنظیمات-دیتابیس)
5. [اطلاعات احراز هویت](#اطلاعات-احراز-هویت)
6. [دستورات مفید](#دستورات-مفید)

---

## 🔐 اطلاعات سرور و SSH

### اطلاعات اتصال

```bash
سرور: 37.152.174.87
کاربر: root
پورت: 22
```

### نحوه اتصال SSH

```bash
ssh root@37.152.174.87
```

### مسیر پروژه در سرور

```bash
/var/www/miniapbale
```

### دستورات اولیه برای کار با سرور

```bash
# اتصال به سرور
ssh root@37.152.174.87

# رفتن به مسیر پروژه
cd /var/www/miniapbale

# مشاهده وضعیت کانتینرها
docker compose ps

# مشاهده لاگ‌ها
docker compose logs -f

# ری‌استارت سرویس‌ها
docker compose restart

# متوقف کردن همه سرویس‌ها
docker compose down

# شروع مجدد همه سرویس‌ها
docker compose up -d
```

---

## 🐳 تنظیمات Docker

### فایل docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: miniapbale_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: miniapbale
      POSTGRES_USER: miniapp
      POSTGRES_PASSWORD: ${DB_PASSWORD:-miniapp_secure_2024}
      POSTGRES_INITDB_ARGS: "-E UTF8 --locale=en_US.UTF-8"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U miniapp -d miniapbale"]
      interval: 10s
      timeout: 5s
      retries: 5

  # PHP-FPM API
  php:
    build:
      context: ./docker/php
      dockerfile: Dockerfile
    container_name: miniapbale_php
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: miniapbale
      DB_USER: miniapp
      DB_PASSWORD: ${DB_PASSWORD:-miniapp_secure_2024}
    volumes:
      - ./api:/var/www/html/api
      - ./uploads:/var/www/html/uploads
      - ./docker/php/php.ini:/usr/local/etc/php/conf.d/custom.ini
    working_dir: /var/www/html

  # Nginx Web Server
  nginx:
    image: nginx:1.25-alpine
    container_name: miniapbale_nginx
    restart: unless-stopped
    depends_on:
      - php
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./:/var/www/html
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf
      - nginx_logs:/var/log/nginx
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health.php"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Adminer for Database Management
  adminer:
    image: adminer:latest
    container_name: miniapbale_adminer
    restart: unless-stopped
    depends_on:
      - postgres
    ports:
      - "8080:8080"
    environment:
      ADMINER_DEFAULT_SERVER: postgres
      ADMINER_DESIGN: nette

volumes:
  postgres_data:
    driver: local
  nginx_logs:
    driver: local

networks:
  default:
    name: miniapbale_network
```

### Dockerfile PHP

```dockerfile
FROM php:8.2-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    postgresql-dev \
    libpq \
    icu-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    curl

# Install PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    pgsql \
    intl \
    zip \
    opcache

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Configure PHP
RUN { \
    echo 'opcache.enable=1'; \
    echo 'opcache.memory_consumption=128'; \
    echo 'opcache.interned_strings_buffer=8'; \
    echo 'opcache.max_accelerated_files=4000'; \
    echo 'opcache.revalidate_freq=60'; \
    echo 'opcache.fast_shutdown=1'; \
} > /usr/local/etc/php/conf.d/opcache.ini

# Set working directory
WORKDIR /var/www/html

# Create uploads directory
RUN mkdir -p /var/www/html/uploads && \
    chown -R www-data:www-data /var/www/html

# Expose port 9000
EXPOSE 9000

CMD ["php-fpm"]
```

---

## ⚙️ تنظیمات Nginx

### nginx.conf اصلی

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;
    gzip_disable "msie6";

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Include server configurations
    include /etc/nginx/conf.d/*.conf;
}
```

### default.conf (تنظیمات سایت)

```nginx
server {
    listen 80;
    server_name localhost;
    root /var/www/html;
    index index.html index.php;

    # Charset
    charset utf-8;

    # Logging
    access_log /var/log/nginx/miniapbale_access.log;
    error_log /var/log/nginx/miniapbale_error.log;

    # Main location
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API endpoints
    location ~ ^/api/.*\.php$ {
        fastcgi_pass php:9000;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;

        # Increase timeouts for API
        fastcgi_read_timeout 300;
        fastcgi_send_timeout 300;

        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Session-Token" always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    # Health check endpoint
    location = /health.php {
        fastcgi_pass php:9000;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        access_log off;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Deny access to backup files
    location ~ ~$ {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Admin panel
    location /admin.html {
        try_files $uri =404;
    }

    location ~ ^/admin.*\.php$ {
        fastcgi_pass php:9000;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
```

---

## 🗄️ تنظیمات دیتابیس

### اطلاعات اتصال PostgreSQL

```bash
# داخل کانتینر
Host: postgres
Port: 5432
Database: miniapbale
User: miniapp
Password: miniapp_secure_2024

# از خارج سرور (Direct Access)
Host: 37.152.174.87
Port: 5432
Database: miniapbale
User: miniapp
Password: miniapp_secure_2024
```

### دسترسی به Adminer (مدیریت دیتابیس)

```
URL: http://37.152.174.87:8080
System: PostgreSQL
Server: postgres
Username: miniapp
Password: miniapp_secure_2024
Database: miniapbale
```

### اتصال مستقیم به دیتابیس از CLI

```bash
# از داخل سرور
docker exec -it miniapbale_postgres psql -U miniapp -d miniapbale

# کوئری‌های مفید
\dt                           # لیست جداول
\d medical_centers           # ساختار جدول
SELECT COUNT(*) FROM medical_centers;
```

---

## 🔑 اطلاعات احراز هویت

### متغیرهای محیطی (.env)

```bash
# Database Configuration
DB_PASSWORD=miniapp_secure_2024
DB_HOST=postgres
DB_PORT=5432
DB_NAME=miniapbale
DB_USER=miniapp

# Application Configuration
APP_ENV=production
APP_DEBUG=false
APP_TIMEZONE=Asia/Tehran

# Session Configuration
SESSION_SECRET=change_this_to_random_string_in_production

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=change_this_hash
```

### نام کاربری و رمز عبور پیش‌فرض Admin

```bash
# برای مشاهده/تغییر رمز ادمین، از این اسکریپت استفاده کنید:
# در سرور اجرا کنید:
cd /var/www/miniapbale
php set_default_passwords.php
```

---

## 🛠️ دستورات مفید

### مدیریت Docker

```bash
# مشاهده وضعیت کانتینرها
docker compose ps

# شروع سرویس‌ها
docker compose up -d

# متوقف کردن سرویس‌ها
docker compose down

# ری‌استارت یک سرویس خاص
docker compose restart nginx
docker compose restart php
docker compose restart postgres

# مشاهده لاگ‌ها
docker compose logs -f                 # همه سرویس‌ها
docker compose logs -f nginx          # فقط nginx
docker compose logs -f php            # فقط PHP
docker compose logs -f postgres       # فقط PostgreSQL

# بیلد مجدد PHP container
docker compose build php
docker compose up -d php

# پاک کردن volumes (خطرناک!)
docker compose down -v
```

### مدیریت فایل‌ها (انتقال از Local به Server)

```bash
# انتقال فایل به سرور
scp /path/to/local/file root@37.152.174.87:/var/www/miniapbale/

# انتقال پوشه به سرور
scp -r /path/to/local/folder root@37.152.174.87:/var/www/miniapbale/

# انتقال از سرور به Local
scp root@37.152.174.87:/var/www/miniapbale/file.txt ./

# Rsync (بهتر برای فایل‌های زیاد)
rsync -avz /path/to/local/ root@37.152.174.87:/var/www/miniapbale/
```

### Git Commands

```bash
# در Local
git add .
git commit -m "پیام کامیت"
git push origin main

# در سرور
cd /var/www/miniapbale
git pull origin main

# اگر تغییرات محلی در سرور دارید
git stash
git pull origin main
git stash pop
```

### دستورات Nginx

```bash
# تست تنظیمات nginx
docker exec miniapbale_nginx nginx -t

# ریلود تنظیمات nginx
docker exec miniapbale_nginx nginx -s reload

# مشاهده لاگ‌های nginx
docker exec miniapbale_nginx tail -f /var/log/nginx/access.log
docker exec miniapbale_nginx tail -f /var/log/nginx/error.log
```

### دستورات PHP

```bash
# اجرای اسکریپت PHP در سرور
docker exec miniapbale_php php /var/www/html/script.php

# دسترسی به PHP CLI
docker exec -it miniapbale_php php -v
docker exec -it miniapbale_php composer --version
```

### Backup و Restore

```bash
# Backup دیتابیس
docker exec miniapbale_postgres pg_dump -U miniapp miniapbale > backup_$(date +%Y%m%d).sql

# Restore دیتابیس
cat backup.sql | docker exec -i miniapbale_postgres psql -U miniapp -d miniapbale

# Backup فایل‌های uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Restore uploads
tar -xzf uploads_backup.tar.gz
```

---

## 📝 نکات مهم

### امنیت

1. **تغییر رمز عبور پیش‌فرض**: حتماً رمز دیتابیس را در production تغییر دهید
2. **Firewall**: پورت‌های غیرضروری را ببندید
3. **SSL**: برای production حتماً SSL نصب کنید
4. **Backup منظم**: هر روز backup از دیتابیس و فایل‌ها بگیرید

### Performance

1. **Log Rotation**: لاگ‌های nginx را rotate کنید
2. **Database Indexes**: از indexها استفاده کنید
3. **Caching**: از Redis یا Memcached استفاده کنید

### Monitoring

```bash
# مشاهده استفاده منابع
docker stats

# مشاهده دیسک
df -h

# مشاهده RAM
free -h

# مشاهده CPU
top
htop
```

---

## 🌐 URLs مهم

```
سایت اصلی: http://37.152.174.87
پنل ادمین: http://37.152.174.87/admin.html
Adminer: http://37.152.174.87:8080
API: http://37.152.174.87/api/
Health Check: http://37.152.174.87/health.php
```

---

## 📞 تماس و پشتیبانی

این فایل شامل تمام اطلاعات لازم برای راه‌اندازی، مدیریت و نگهداری سرور MiniApbale است.

**آخرین بروزرسانی**: 2025-12-02

---

## 🔄 Quick Start Guide

### برای شروع سریع یک پروژه جدید:

```bash
# 1. Clone کردن پروژه
git clone [repository-url] miniapbale
cd miniapbale

# 2. ساخت فایل .env
cp .env.example .env
# ویرایش .env و تنظیم رمزها

# 3. اجرای Docker
docker compose up -d

# 4. چک کردن وضعیت
docker compose ps
docker compose logs -f

# 5. دسترسی به سایت
# http://localhost (برای local)
# http://37.152.174.87 (برای server)
```

---

**نکته**: این فایل را در مکان امن نگهداری کنید زیرا شامل اطلاعات حساس است.
