CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entered_at TEXT NOT NULL,
  reason_open TEXT NOT NULL,
  exited_at TEXT,
  reason_close TEXT,
  outcome TEXT,
  percent_risked REAL,
  percent_return REAL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);