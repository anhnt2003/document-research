-- Enable pgvector on first DB init. Idempotent.
CREATE EXTENSION IF NOT EXISTS vector;
