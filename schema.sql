-- Users (premium / monetization)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  premium INTEGER NOT NULL DEFAULT 0,
  premium_charge_id TEXT,
  premium_at INTEGER
);

-- Daily challenge results
CREATE TABLE IF NOT EXISTS daily_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  user_photo TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  time_ms INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_date_time ON daily_results(date, time_ms);

-- Multiplayer rooms (customize columns for your game)
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  seed INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  player1_id TEXT NOT NULL,
  player2_id TEXT,
  player1_name TEXT NOT NULL DEFAULT '',
  player2_name TEXT,
  player1_photo TEXT DEFAULT '',
  player2_photo TEXT DEFAULT '',
  player1_progress REAL NOT NULL DEFAULT 0,
  player2_progress REAL NOT NULL DEFAULT 0,
  winner_id TEXT,
  rematch_room_id TEXT,
  start_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at);
