-- MiniFlow Database Initialization Script

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS miniflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE miniflow;

-- Grant privileges to miniflow user
GRANT ALL PRIVILEGES ON miniflow.* TO 'miniflow'@'%';
FLUSH PRIVILEGES;

-- Set timezone
SET time_zone = '+00:00';

-- Create initial admin user (will be handled by application later)
-- This is just a placeholder for future use
