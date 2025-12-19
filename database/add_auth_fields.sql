-- Add username and password fields for authentication
ALTER TABLE users
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Update existing users: set username to phone_number
UPDATE users SET username = phone_number WHERE username IS NULL;

-- Update existing users: set password_hash to employee_code (temporary, will be hashed by app)
UPDATE users SET password_hash = employee_code WHERE password_hash IS NULL;
