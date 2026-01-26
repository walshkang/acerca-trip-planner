-- Enable pgcrypto extension for digest() and encode() functions
-- Also covers gen_random_uuid() used in existing migrations
CREATE EXTENSION IF NOT EXISTS pgcrypto;
