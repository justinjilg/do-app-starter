-- Database schema for do-app-starter
-- Run this after connecting to your PostgreSQL database

-- Create items table (example)
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO items (name, description) VALUES
    ('Sample Item 1', 'This is a sample item created during database setup'),
    ('Sample Item 2', 'Another example item to demonstrate the API'),
    ('Sample Item 3', 'Third item with some description text');
