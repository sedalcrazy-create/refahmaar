-- Migration script for Yalda Snake Challenge
-- Run this on existing database to add kills support and update high_scores view

-- Add kills column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leaderboard' AND column_name = 'kills') THEN
        ALTER TABLE leaderboard ADD COLUMN kills INTEGER DEFAULT 0;
        RAISE NOTICE 'Added kills column to leaderboard table';
    ELSE
        RAISE NOTICE 'kills column already exists';
    END IF;
END $$;

-- Drop and recreate the view with new columns
DROP VIEW IF EXISTS high_scores;

CREATE VIEW high_scores AS
SELECT
    u.id,
    u.bale_user_id,
    u.first_name,
    u.last_name,
    u.employee_code,
    COALESCE(SUM(l.score), 0) as high_score,
    COALESCE(SUM(l.snake_length), 0) as total_length,
    COALESCE(SUM(l.kills), 0) as total_kills,
    COUNT(l.id) as games_played,
    MAX(l.game_date) as last_played
FROM users u
LEFT JOIN leaderboard l ON u.id = l.user_id
GROUP BY u.id, u.bale_user_id, u.first_name, u.last_name, u.employee_code
ORDER BY high_score DESC NULLS LAST;

-- Verify
SELECT 'Migration complete. View columns:' as status;
SELECT column_name FROM information_schema.columns WHERE table_name = 'leaderboard' ORDER BY ordinal_position;
