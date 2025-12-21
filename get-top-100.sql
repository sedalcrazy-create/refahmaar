-- ==============================================
-- 🏆 YALDA SNAKE - TOP 100 RANKING SYSTEM
-- ==============================================

-- Step 1: Get ranked players with tie detection
WITH ranked_players AS (
    SELECT
        id,
        first_name,
        last_name,
        employee_code,
        phone_number,
        total_score,
        total_length,
        games_played,
        ROW_NUMBER() OVER (ORDER BY total_score DESC, total_length DESC) as rank,
        DENSE_RANK() OVER (ORDER BY total_score DESC) as score_rank,
        COUNT(*) OVER (PARTITION BY total_score) as same_score_count
    FROM high_scores
),

-- Step 2: Identify ties (same score, different rank)
ties AS (
    SELECT
        total_score,
        same_score_count,
        MIN(rank) as first_rank,
        MAX(rank) as last_rank
    FROM ranked_players
    WHERE same_score_count > 1
    GROUP BY total_score, same_score_count
)

-- Step 3: Final result with tie indicator
SELECT
    rp.rank as "رتبه",
    rp.first_name || ' ' || rp.last_name as "نام",
    rp.employee_code as "کد استخدامی",
    rp.total_score as "مجموع امتیاز",
    rp.total_length as "مجموع طول",
    rp.games_played as "تعداد بازی",
    CASE
        WHEN rp.same_score_count > 1 THEN '⚠️ نیاز به Playoff'
        ELSE '✅'
    END as "وضعیت"
FROM ranked_players rp
WHERE rp.rank <= 100
ORDER BY rp.rank;

-- ==============================================
-- Show ties that need playoff
-- ==============================================
SELECT
    '⚠️ PLAYOFF NEEDED' as status,
    total_score as score,
    same_score_count as players_tied,
    STRING_AGG(first_name || ' ' || last_name, ' vs ') as players
FROM ranked_players
WHERE same_score_count > 1 AND rank <= 100
GROUP BY total_score, same_score_count
ORDER BY total_score DESC;
