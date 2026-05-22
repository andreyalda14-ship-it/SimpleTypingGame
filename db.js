const Database = require("better-sqlite3");
const path = require("path");
const {
  sanitizePlayerName,
  sanitizeScore,
  sanitizeLimit,
} = require("./lib/validate");

const dbPath = path.join(__dirname, "scores.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_scores_score ON scores (score DESC);
`);

/**
 * Insert a player's name and score into the database.
 * @param {string} playerName
 * @param {number} score
 * @returns {{ id: number, playerName: string, score: number, createdAt: string }}
 */
function addPlayerScore(playerName, score) {
  const name = sanitizePlayerName(playerName);
  const points = sanitizeScore(score);

  const stmt = db.prepare(
    "INSERT INTO scores (player_name, score) VALUES (?, ?)"
  );
  const result = stmt.run(name, points);

  const row = db
    .prepare(
      `SELECT id, player_name AS playerName, score, created_at AS createdAt
       FROM scores WHERE id = ?`
    )
    .get(result.lastInsertRowid);

  return row;
}

/**
 * @param {number} [limit=10]
 * @returns {Array<{ id: number, playerName: string, score: number, createdAt: string }>}
 */
function getTopScores(limit = 10) {
  const safeLimit = sanitizeLimit(limit);
  return db
    .prepare(
      `SELECT id, player_name AS playerName, score, created_at AS createdAt
       FROM scores
       ORDER BY score DESC, created_at ASC
       LIMIT ?`
    )
    .all(safeLimit);
}

module.exports = { addPlayerScore, getTopScores, dbPath };
