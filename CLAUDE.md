# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Yalda Snake Challenge** - A multiplayer Snake game for Yalda (Persian winter solstice) celebration, integrated with Bale messenger mini-app platform.

**Target Users:** Employees of Welfare and Treatment Department
**Platform:** Bale Mini App (HTML5 + WebSocket)
**Competition Date:** Sunday, December 21, 2024 (30 Azar 1403)

## Technology Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Real-time:** Socket.io for multiplayer gameplay
- **Database:** PostgreSQL 15
- **Deployment:** Docker + Docker Compose

### Frontend
- **UI:** Vanilla HTML5 + CSS3
- **Game Rendering:** HTML5 Canvas
- **Integration:** Bale Mini App SDK (https://tapi.bale.ai/miniapp.js)
- **Real-time Client:** Socket.io client

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Run locally (requires PostgreSQL)
npm start

# Run with Docker
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Database
```bash
# Access PostgreSQL container
docker exec -it yalda_snake_db psql -U snake_user -d yalda_snake

# View users
SELECT * FROM users;

# View leaderboard
SELECT * FROM high_scores ORDER BY high_score DESC LIMIT 10;

# Reset database
docker-compose down -v
docker-compose up -d
```

### Deployment
```bash
# Build for production
docker-compose build

# Deploy to server
docker-compose up -d --build

# Check health
curl http://localhost:3001/health
```

## Architecture

### Game Loop (Server-Authoritative)
1. **Game Controller** (`app/controllers/game-controller.js`) manages game state
2. Runs at configurable FPS (default: 10 FPS)
3. Broadcasts game state to all connected clients via Socket.io
4. Players send only directional inputs (anti-cheat)

### Key Components

**Models:**
- `Player` - Tracks snake position, score, kills, deaths, and database user ID
- `Food` - Different types with emoji representation (🍎🍉🍇)
- `Coordinate` - Grid-based position system
- `PlayerContainer` - Manages all active players

**Services:**
- `PlayerService` - Player lifecycle (spawn, move, collision, respawn)
- `FoodService` - Food generation and consumption
- `BoardOccupancyService` - Grid state management (collisions, occupancy)
- `PlayerSpawnService` - Safe spawn point calculation
- `ColorService` - Random player colors
- `GameControlsService` - Keyboard/touch input handling

**Database:**
- `userService` - User registration, score saving, leaderboard queries
- Uses PostgreSQL with connection pooling

### Client-Server Communication

**Server Events (Incoming):**
- `register user` - New user registration with employee code
- `join game` - Existing user login
- `key down` - Player movement input
- `request leaderboard` - Fetch top players
- `disconnect` - Player leaves

**Server Events (Outgoing):**
- `registration result` - Registration success/failure
- `new player info` - Player ID and color assignment
- `board info` - Canvas dimensions
- `game update` - Full game state every frame
- `leaderboard update` - Top 10 players
- `you died` - Death notification with final score

### Bale Integration

The game uses Bale Mini App SDK for user authentication:

```javascript
// Client-side
window.Bale.WebApp.ready();
const userData = window.Bale.WebApp.initDataUnsafe.user;
// userData contains: id, first_name, last_name, phone_number
```

User identification flow:
1. Get `bale_user_id` from SDK
2. Check if user exists in database
3. If new, prompt for employee code registration
4. Link Bale ID to database user record
5. All scores tied to `db_user_id`

## Configuration

Environment variables (`.env`):
- `PORT` - Server port (default: 3001)
- `POSTGRES_*` - Database connection details
- `MAX_PLAYERS` - Concurrent player limit (default: 150)
- `GAME_SPEED` - FPS rate (default: 10)
- `BOARD_WIDTH/HEIGHT` - Canvas grid size

## Important Implementation Details

### Anti-Cheat Measures
- All game logic runs server-side
- Clients only send directional inputs
- Score calculation happens on server
- Movement speed enforced by game loop FPS
- Database uses user_id from registration (not client-provided)

### Scoring System
```javascript
score += foodPoints;  // 🍎=1, 🍉=5, 🍇=10
finalScore = score * gameDuration;
```

Only **highest score per user** is stored in leaderboard.

### Performance Considerations
- Server capacity: 100-150 concurrent players on 4GB RAM / 4 Core CPU
- Socket.io uses binary broadcasting for efficiency
- Canvas renders at client FPS (not tied to server game loop)
- PostgreSQL connection pooling (max 20 connections)

### Database Schema

**users table:**
- `bale_user_id` (unique) - Bale messenger user ID
- `phone_number` - From Bale SDK
- `first_name`, `last_name` - Display name
- `employee_code` - Required for registration

**leaderboard table:**
- `user_id` (FK to users)
- `score`, `game_duration`, `snake_length`
- `game_date` - Timestamp of game

**high_scores view:**
- Aggregated max score per user
- Used for leaderboard display

## Code Style

- ES6 classes for models and services
- 'use strict' in all Node.js files
- Semicolons required
- 4-space indentation (existing code)
- RTL (right-to-left) for Persian UI

## Testing Locally Without Bale

For development without Bale SDK:
- `main.js` generates test user ID if Bale unavailable
- Use browser at `http://localhost:3001`
- Enter any employee code to register

## Deployment Checklist

1. Update `.env` with production values
2. Change PostgreSQL password
3. Set up HTTPS (required for Bale mini-apps)
4. Configure Nginx reverse proxy
5. Register bot with @botfather in Bale
6. Set mini-app URL to your domain
7. Test with test users before launch

## Known Limitations

- No room system (all players in one game)
- No admin panel (intentionally removed for simplicity)
- No bot players
- No image uploads (simplified from sample code)
- Leaderboard shows top 10 only (can be increased)

## Competition Rules (Programmatic)

- Competition runs: Start of Sunday to end of Sunday (check date in PRD)
- Multiple plays allowed per user
- Only **highest score** counts
- Winners announced from `high_scores` view
- Employee code required for prize eligibility

## File Locations

- **Main entry:** `app.js`
- **Game logic:** `app/controllers/game-controller.js`
- **Database operations:** `database/userService.js`
- **Client code:** `public/js/main.js`
- **Styles:** `public/css/style.css`
- **Database schema:** `database/init.sql`

## Useful Queries

```sql
-- Top 10 players
SELECT * FROM high_scores ORDER BY high_score DESC LIMIT 10;

-- Player count
SELECT COUNT(*) FROM users;

-- Games played today
SELECT COUNT(*) FROM leaderboard
WHERE game_date::date = CURRENT_DATE;

-- Player stats
SELECT u.first_name, u.last_name, u.employee_code,
       COUNT(l.id) as games_played,
       MAX(l.score) as best_score
FROM users u
LEFT JOIN leaderboard l ON u.id = l.user_id
GROUP BY u.id;
```
