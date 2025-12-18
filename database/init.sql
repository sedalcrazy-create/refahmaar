-- Yalda Snake Challenge Database Schema
-- Created for Welfare and Treatment Department

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    bale_user_id TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    employee_code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    game_duration INTEGER DEFAULT 0, -- in seconds
    snake_length INTEGER DEFAULT 3,
    game_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, game_date)
);

-- Create high scores view (only best score per user)
CREATE OR REPLACE VIEW high_scores AS
SELECT
    u.id,
    u.bale_user_id,
    u.first_name,
    u.last_name,
    u.employee_code,
    MAX(l.score) as high_score,
    MAX(l.snake_length) as max_length,
    MAX(l.game_date) as last_played
FROM users u
LEFT JOIN leaderboard l ON u.id = l.user_id
GROUP BY u.id, u.bale_user_id, u.first_name, u.last_name, u.employee_code
ORDER BY high_score DESC NULLS LAST;

-- Create index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id ON leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_users_bale_id ON users(bale_user_id);

-- Insert test data (optional - for development)
-- Uncomment below for testing
/*
INSERT INTO users (bale_user_id, phone_number, first_name, last_name, employee_code)
VALUES
    ('test_user_1', '09121234567', 'علی', 'احمدی', 'EMP001'),
    ('test_user_2', '09129876543', 'مریم', 'محمدی', 'EMP002')
ON CONFLICT (bale_user_id) DO NOTHING;
*/
