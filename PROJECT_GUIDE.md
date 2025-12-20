# Yalda Snake Challenge - راهنمای کامل پروژه

## اطلاعات سرور

### اتصال SSH
```bash
ssh miniapbale
# یا
ssh ubuntu@<SERVER_IP>
```

### مسیرهای مهم روی سرور
```
/opt/yalda-snake/              # پوشه اصلی پروژه
/opt/yalda-snake/.env          # تنظیمات محیطی
/opt/yalda-snake/docker-compose.yml
```

### کانتینرهای Docker
| نام کانتینر | توضیح | پورت |
|-------------|-------|------|
| `yalda_snake_app` | اپلیکیشن Node.js | 3001 |
| `yalda_snake_db` | دیتابیس PostgreSQL | 5432 (internal) |
| `yalda_snake_bot` | ربات بله | - |

---

## دستورات پرکاربرد

### مشاهده لاگ‌ها
```bash
ssh miniapbale "docker logs yalda_snake_app --tail 50"
ssh miniapbale "docker logs yalda_snake_bot --tail 50"
```

### ری‌استارت سرویس‌ها
```bash
ssh miniapbale "docker restart yalda_snake_app"
# یا کامل:
ssh miniapbale "cd /opt/yalda-snake && docker compose down && docker compose up -d"
```

### کپی فایل به سرور
```bash
# کپی به /tmp سرور
scp "path/to/local/file.js" miniapbale:/tmp/file.js

# کپی به داخل کانتینر
ssh miniapbale "docker cp /tmp/file.js yalda_snake_app:/app/path/to/file.js"
```

### دانلود فایل از سرور
```bash
ssh miniapbale "docker exec yalda_snake_app cat /app/path/to/file.js" > local-file.js
```

### اجرای دستور در کانتینر
```bash
ssh miniapbale "docker exec yalda_snake_app <command>"
# مثال:
ssh miniapbale "docker exec yalda_snake_app grep 'fontSize' /app/public/js/pixi-renderer.js"
```

---

## دستورات دیتابیس

### اتصال به PostgreSQL
```bash
ssh miniapbale "docker exec yalda_snake_db psql -U snake_user -d yalda_snake"
```

### کوئری‌های پرکاربرد
```sql
-- لیست کاربران
SELECT id, bale_user_id, first_name, last_name, phone_number FROM users;

-- لیدربورد
SELECT * FROM high_scores ORDER BY high_score DESC LIMIT 10;

-- تعداد بازی‌های یک کاربر
SELECT COUNT(*) FROM leaderboard WHERE user_id = <USER_ID>;

-- ریست بازی‌های یک کاربر (با شماره تلفن)
DELETE FROM leaderboard WHERE user_id = (SELECT id FROM users WHERE phone_number = '09XXXXXXXXX');

-- ریست بازی‌های یک کاربر (با bale_user_id)
DELETE FROM leaderboard WHERE user_id = (SELECT id FROM users WHERE bale_user_id = 'XXXX');

-- پاک کردن کل لیدربورد
DELETE FROM leaderboard;
```

---

## ساختار فایل‌های اصلی

```
marrefah/
├── app.js                          # نقطه ورود اصلی سرور
├── app/
│   └── controllers/
│       └── game-controller.js      # منطق بازی (سمت سرور)
├── database/
│   ├── db.js                       # اتصال به PostgreSQL
│   ├── userService.js              # سرویس کاربران
│   └── init.sql                    # اسکیمای دیتابیس
├── public/
│   ├── index.html                  # صفحه اصلی
│   ├── css/
│   │   └── style.css               # استایل‌ها
│   └── js/
│       ├── game.js                 # منطق کلاینت + Socket.io
│       ├── pixi-renderer.js        # رندرینگ PixiJS
│       ├── asset-generator.js      # تولید تکسچر میوه‌ها
│       └── particle-effects.js     # افکت‌های ذرات
├── bot/
│   └── bot.py                      # ربات بله (Python)
├── docker-compose.yml
├── Dockerfile
└── .env                            # تنظیمات (روی سرور)
```

---

## تنظیمات مهم

### فایل .env روی سرور (`/opt/yalda-snake/.env`)
```env
POSTGRES_DB=yalda_snake
POSTGRES_USER=snake_user
POSTGRES_PASSWORD=<PASSWORD>
MAX_PLAYERS=10
GAME_SPEED=12
BOARD_WIDTH=20
BOARD_HEIGHT=15
BALE_BOT_TOKEN=<TOKEN>
GAME_URL=https://snake.darmanjoo.ir
```

### تنظیمات بازی (game-controller.js)
```javascript
const BOARD_WIDTH = 20;      // عرض صفحه بازی
const BOARD_HEIGHT = 15;     // ارتفاع صفحه بازی
const GAME_SPEED = 12;       // FPS سرور
const MAX_PLAYERS = 10;      // حداکثر بازیکن همزمان
const MAX_GAMES_PER_USER = 3; // حداکثر بازی هر کاربر
const GAME_DURATION_SECONDS = 180; // مدت بازی (3 دقیقه)
```

### تنظیمات کلاینت (game.js)
```javascript
const squareSize = 50;       // اندازه هر خانه (پیکسل)
const GAME_DURATION = 180;   // تایمر بازی (ثانیه)
```

### تنظیمات رندرینگ (pixi-renderer.js)
```javascript
this.serverTickInterval = 83; // میلی‌ثانیه بین آپدیت‌ها (1000/12 FPS)
fontSize: 24                  // اندازه اسم بازیکن
```

---

## Socket.io Events

### کلاینت -> سرور
| Event | Data | توضیح |
|-------|------|-------|
| `join game` | `{baleUserId}` | بررسی ثبت‌نام کاربر |
| `join` | `{baleUserId, name}` | ورود به بازی |
| `direction` | `{x, y}` | تغییر جهت مار |
| `request leaderboard` | - | درخواست لیدربورد |
| `time-up` | `{score}` | پایان زمان بازی |

### سرور -> کلاینت
| Event | Data | توضیح |
|-------|------|-------|
| `init` | `{playerId, boardWidth, boardHeight, players, food}` | شروع بازی |
| `update` | `{players, food}` | آپدیت وضعیت بازی |
| `player-died` | `{id, name, score}` | مرگ بازیکن |
| `game-limit-reached` | `{message, gamesPlayed}` | محدودیت 3 بازی |
| `error` | `{message}` | خطا |

---

## جدول‌های دیتابیس

### users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    bale_user_id VARCHAR(50) UNIQUE,
    phone_number VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    username VARCHAR(100),
    employee_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### leaderboard
```sql
CREATE TABLE leaderboard (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    score INTEGER DEFAULT 0,
    snake_length INTEGER DEFAULT 3,
    game_duration INTEGER DEFAULT 0,
    game_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### high_scores (VIEW - نه TABLE!)
```sql
-- این یک VIEW است و نباید INSERT کرد!
CREATE VIEW high_scores AS
SELECT user_id, MAX(score) as high_score, ...
FROM leaderboard GROUP BY user_id;
```

---

## کارهای انجام شده (Session 20 Dec 2024)

### 1. رفع مشکل ثبت‌نام
- اضافه کردن URL hash parsing برای `tgWebAppData`
- پشتیبانی از چند نوع SDK بله (`BaleWebApp`, `window.Bale.WebApp`, `window.BaleWebApp`)

### 2. تنظیمات بازی
- تغییر اندازه صفحه به 20x15
- تغییر اندازه مار/میوه به 50 پیکسل
- تغییر FPS به 12
- محدودیت 10 بازیکن همزمان
- محدودیت 3 بازی برای هر کاربر
- تایمر 3 دقیقه‌ای

### 3. رفع لرزش مار
- تنظیم `serverTickInterval` به 83ms (هماهنگ با 12 FPS)

### 4. تم یلدایی
- پس‌زمینه قرمز تیره برای صفحه ورود
- عنوان و زیرعنوان طلایی
- برف‌باری و میوه‌های شناور در صفحه بازی
- حاشیه طلایی

### 5. اسم بازیکن
- فونت بزرگتر (24px)
- بولدتر (stroke width: 5)

### 6. پیام محدودیت بازی
- نمایش پیام "بازی‌های شما تمام شد" برای کاربرانی که 3 بار بازی کرده‌اند

### 7. رفع باگ‌ها
- رفع SQL query (اضافه کردن `$1`)
- حذف INSERT به `high_scores` (چون VIEW است)

---

## نکات مهم برای ادامه کار

### 1. بعد از تغییر فایل‌ها
```bash
# کپی فایل به سرور
scp "path/to/file" miniapbale:/tmp/
ssh miniapbale "docker cp /tmp/file yalda_snake_app:/app/path/to/file"

# برای فایل‌های JS/CSS سمت کلاینت، نیازی به restart نیست
# برای فایل‌های سمت سرور (game-controller.js, app.js):
ssh miniapbale "docker restart yalda_snake_app"
```

### 2. تغییر تنظیمات محیطی
```bash
# ویرایش .env
ssh miniapbale "nano /opt/yalda-snake/.env"

# بازسازی کانتینر
ssh miniapbale "cd /opt/yalda-snake && docker compose up -d --force-recreate app"

# دوباره کپی فایل‌ها (چون کانتینر از image ساخته می‌شود)
```

### 3. برای 1000 بازیکن همزمان
نیاز به:
- سیستم Room برای تقسیم بازیکنان
- Redis Adapter برای Socket.io
- Load Balancer
- چند Instance از Node.js

### 4. کش مرورگر
بعد از تغییر CSS/JS، ورژن را آپدیت کنید:
```html
<link rel="stylesheet" href="/css/style.css?v=20251220">
<script src="/js/game.js?v=20251220"></script>
```

---

## لینک‌های مفید

- **بازی:** https://snake.darmanjoo.ir
- **ربات بله:** @refahsnakebot
- **گیت‌هاب:** https://github.com/sedalcrazy-create/refahmaar

---

## تماس

برای سوالات فنی با Claude Code کار کنید و این فایل را به عنوان context بدهید.
