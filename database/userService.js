'use strict';

const db = require('./db');
const crypto = require('crypto');

class UserService {
    // Simple hash function (SHA256) - for production use bcrypt
    hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    // Register new user
    async registerUser(baleUserId, phoneNumber, firstName, lastName, employeeCode) {
        const username = phoneNumber; // username is phone number
        const passwordHash = this.hashPassword(employeeCode); // password is employee code

        const query = `
            INSERT INTO users (bale_user_id, phone_number, first_name, last_name, employee_code, username, password_hash)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (bale_user_id) DO UPDATE
            SET phone_number = $2, first_name = $3, last_name = $4, employee_code = $5,
                username = $6, password_hash = $7, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        try {
            const result = await db.query(query, [baleUserId, phoneNumber, firstName, lastName, employeeCode, username, passwordHash]);
            return result.rows[0];
        } catch (error) {
            console.error('Error registering user:', error);
            throw error;
        }
    }

    // Get user by Bale ID
    async getUserByBaleId(baleUserId) {
        const query = 'SELECT * FROM users WHERE bale_user_id = $1';
        try {
            const result = await db.query(query, [baleUserId]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    // Update user names
    async updateUserNames(userId, firstName, lastName) {
        const query = `
            UPDATE users
            SET first_name = $2, last_name = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;

        try {
            const result = await db.query(query, [userId, firstName, lastName]);
            return result.rows[0];
        } catch (error) {
            console.error('Error updating user names:', error);
            throw error;
        }
    }

    // Save score to leaderboard
    async saveScore(userId, score, gameDuration, snakeLength) {
        const query = `
            INSERT INTO leaderboard (user_id, score, game_duration, snake_length)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        try {
            const result = await db.query(query, [userId, score, gameDuration, snakeLength]);
            return result.rows[0];
        } catch (error) {
            console.error('Error saving score:', error);
            throw error;
        }
    }

    // Get top N players
    async getTopPlayers(limit = 10) {
        const query = `
            SELECT
                first_name,
                last_name,
                employee_code,
                high_score,
                total_length as max_length,
                total_kills,
                games_played,
                last_played
            FROM high_scores
            WHERE high_score IS NOT NULL
            ORDER BY high_score DESC, total_length DESC
            LIMIT $1
        `;

        try {
            const result = await db.query(query, [limit]);
            return result.rows;
        } catch (error) {
            console.error('Error getting top players:', error);
            throw error;
        }
    }

    // Get user rank
    async getUserRank(userId) {
        const query = `
            WITH ranked_users AS (
                SELECT
                    id,
                    high_score,
                    ROW_NUMBER() OVER (ORDER BY high_score DESC) as rank
                FROM high_scores
                WHERE high_score IS NOT NULL
            )
            SELECT rank FROM ranked_users WHERE id = $1
        `;

        try {
            const result = await db.query(query, [userId]);
            return result.rows[0]?.rank || null;
        } catch (error) {
            console.error('Error getting user rank:', error);
            throw error;
        }
    }
}

module.exports = new UserService();
