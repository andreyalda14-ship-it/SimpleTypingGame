const Database = require("better-sqlite3");
const path = require("path");
const {
  sanitizePlayerName,
  sanitizeScore,
  sanitizeLimit,
  LEADERBOARD_TOP,
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

/**
 * Leaderboard position for an existing row (ties: higher score first, then earlier time).
 * @param {number} id
 * @returns {number | null}
 */
function getStandingForEntry(id) {
  const entry = db
    .prepare(
      `SELECT score, created_at AS createdAt FROM scores WHERE id = ?`
    )
    .get(id);
  if (!entry) return null;

  const row = db
    .prepare(
      `SELECT COUNT(*) + 1 AS standing
       FROM scores
       WHERE score > @score
          OR (score = @score AND created_at < @createdAt)`
    )
    .get({ score: entry.score, createdAt: entry.createdAt });

  return row.standing;
}

/**
 * Prospective standing if a new score were submitted (before tie-break among equals).
 * @param {number} score
 * @returns {number | null} null when score is 0 (unranked)
 */
function getProspectiveStanding(score) {
  const points = sanitizeScore(score);
  if (points <= 0) return null;

  const row = db
    .prepare(`SELECT COUNT(*) + 1 AS standing FROM scores WHERE score > ?`)
    .get(points);

  return row.standing;
}

/**
 * Whether a score belongs on the leaderboard and its prospective rank if saved.
 * Unranked when score is 0 or below the current top-10 cutoff.
 * @param {number} score
 * @returns {{ unranked: boolean, qualifies: boolean, standing: number | null }}
 */
function evaluateScore(score) {
  const points = sanitizeScore(score);
  if (points <= 0) {
    return { unranked: true, qualifies: false, standing: null };
  }

  const top = getTopScores(LEADERBOARD_TOP);
  if (top.length < LEADERBOARD_TOP) {
    return {
      unranked: false,
      qualifies: true,
      standing: getProspectiveStanding(points),
    };
  }

  const cutoff = top[top.length - 1].score;
  if (points < cutoff) {
    return { unranked: true, qualifies: false, standing: null };
  }

  return {
    unranked: false,
    qualifies: true,
    standing: getProspectiveStanding(points),
  };
}

/** Remove all leaderboard rows. */
function clearAllScores() {
  const result = db.prepare("DELETE FROM scores").run();
  return result.changes;
}

module.exports = {
  addPlayerScore,
  getTopScores,
  getStandingForEntry,
  getProspectiveStanding,
  evaluateScore,
  clearAllScores,
  dbPath,
};
