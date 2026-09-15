DROP TABLE IF EXISTS greetings;

CREATE TABLE greetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO greetings (message) VALUES
  ('Hello World from D1!'),
  ('Cloudflare Pages + D1 is working.'),
  ('Second row, just to prove SELECT works.');
