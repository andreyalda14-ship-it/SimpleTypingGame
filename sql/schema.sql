-- Run once in DigitalOcean Managed PostgreSQL (Console → Queries), or let the app run initDb() on startup.

CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scores_leaderboard
  ON scores (score DESC, created_at ASC);
