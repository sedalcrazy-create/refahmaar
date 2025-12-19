# Deployment Steps for New Changes

## Changes Made:

### 1. Bot Updates (bot/bot.py)
- ✅ Added phone number formatting (+989xxx → 09xxx)
- ✅ Changed button layout: [🎮 شروع بازی] [🏆 رتبه‌بندی] side by side
- ✅ Welcome message shows only first name: "خوش آمدید علی"
- ✅ Shows user record and rank on return

### 2. Database Updates
- ✅ Added `username` and `password_hash` columns to users table
- ✅ Updated userService.js to hash passwords (SHA256)
- ✅ Username = phone number, Password = employee code

### 3. Game Updates
- ✅ Changed background from blue (0x1a1a2e) to Yalda theme (0x2D1B1B - warm dark red/brown)
- ✅ Player labels show username (phone) instead of full name
- ✅ Game controller sends username in updates
- ✅ Auto-login via Bale SDK (already working)

### 4. Fruit Display
- ✅ PixiJS renderer handles watermelon, pomegranate, apple sprites
- ✅ Smooth 60 FPS interpolation (no jittering)

## Deployment to Server:

### Step 1: Update Database Schema
```bash
ssh root@37.152.174.87
cd /opt/yalda-snake
docker exec -i yalda_snake_db psql -U snake_user -d yalda_snake < database/add_auth_fields.sql
```

### Step 2: Upload Changed Files
Upload these files to server:
- bot/bot.py
- database/userService.js
- database/add_auth_fields.sql
- app/controllers/game-controller.js
- public/js/pixi-renderer.js

### Step 3: Restart Containers
```bash
cd /opt/yalda-snake
docker compose restart bot
docker compose restart app
```

### Step 4: Verify
```bash
# Check logs
docker compose logs -f app bot

# Test database
docker exec yalda_snake_db psql -U snake_user -d yalda_snake -c "\d users"
# Should show username and password_hash columns
```

## Testing Checklist:

### Bot Testing:
- [ ] Send /start to @refahsnakebot
- [ ] Share contact (phone number)
- [ ] Enter first name, last name, employee code
- [ ] See buttons: [🎮 شروع بازی] [🏆 رتبه‌بندی]
- [ ] Click شروع بازی → mini-app opens
- [ ] Return to bot → see "خوش آمدید [FirstName]" with record

### Game Testing:
- [ ] Game opens automatically (no login prompt)
- [ ] Background is warm red/brown (not blue)
- [ ] Snake moves smoothly (no jittering)
- [ ] Username (phone) shows above snake (not full name)
- [ ] Fruits show correctly when eaten
- [ ] Score saves to database

### Database Testing:
```sql
-- Check users have username and password_hash
SELECT id, username, password_hash, first_name FROM users LIMIT 5;

-- Verify leaderboard working
SELECT * FROM high_scores ORDER BY high_score DESC LIMIT 10;
```

## Rollback Plan (if needed):
```bash
cd /opt/yalda-snake
git status
git restore .
docker compose restart app bot
```

## Notes:
- Username format: 09xxxxxxxxx (clean phone number)
- Password: SHA256 hash of employee code
- Auto-login: Uses bale_user_id from Bale SDK
- Theme color: 0x2D1B1B (warm Yalda red/brown)
