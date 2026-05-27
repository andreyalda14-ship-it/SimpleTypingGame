const Database = require("better-sqlite3");
const path = require("path");
const {
  sanitizePlayerName,
  sanitizeScore,
  sanitizeLimit,
  LEADERBOARD_TOP,
} = require("../lib/validate");

const dbPath =
  process.env.DATABASE_PATH || path.join(__dirname, "..", "scores.db");

let db;

function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

function mapScoreRow(row) {
  return {
    id: row.id,
    playerName: row.playerName,
    score: row.score,
    createdAt: row.createdAt,
  };
}

async function initDb() {
  const database = getDb();
  database.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_scores_leaderboard
      ON scores (score DESC, created_at ASC);
  `);
}

async function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

async function addPlayerScore(playerName, score) {
  const name = sanitizePlayerName(playerName);
  const points = sanitizeScore(score);
  const database = getDb();

  const result = database
    .prepare("INSERT INTO scores (player_name, score) VALUES (?, ?)")
    .run(name, points);

  const row = database
    .prepare(
      `SELECT id, player_name AS playerName, score, created_at AS createdAt
       FROM scores WHERE id = ?`
    )
    .get(result.lastInsertRowid);

  return mapScoreRow(row);
}

async function getTopScores(limit = 10) {
  const safeLimit = sanitizeLimit(limit);
  const database = getDb();

  const rows = database
    .prepare(
      `SELECT id, player_name AS playerName, score, created_at AS createdAt
       FROM scores
       ORDER BY score DESC, created_at ASC
       LIMIT ?`
    )
    .all(safeLimit);

  return rows.map(mapScoreRow);
}

async function getStandingForEntry(id) {
  const database = getDb();
  const entry = database
    .prepare(
      `SELECT score, created_at AS createdAt FROM scores WHERE id = ?`
    )
    .get(id);
  if (!entry) return null;

  const row = database
    .prepare(
      `SELECT COUNT(*) + 1 AS standing
       FROM scores
       WHERE score > @score
          OR (score = @score AND created_at < @createdAt)`
    )
    .get({ score: entry.score, createdAt: entry.createdAt });

  return row.standing;
}

async function getProspectiveStanding(score) {
  const points = sanitizeScore(score);
  if (points <= 0) return null;

  const database = getDb();
  const row = database
    .prepare(`SELECT COUNT(*) + 1 AS standing FROM scores WHERE score > ?`)
    .get(points);

  return row.standing;
}

async function evaluateScore(score) {
  const points = sanitizeScore(score);
  if (points <= 0) {
    return { unranked: true, qualifies: false, standing: null };
  }

  const top = await getTopScores(LEADERBOARD_TOP);
  if (top.length < LEADERBOARD_TOP) {
    return {
      unranked: false,
      qualifies: true,
      standing: await getProspectiveStanding(points),
    };
  }

  const cutoff = top[top.length - 1].score;
  if (points < cutoff) {
    return { unranked: true, qualifies: false, standing: null };
  }

  return {
    unranked: false,
    qualifies: true,
    standing: await getProspectiveStanding(points),
  };
}

async function clearAllScores() {
  const database = getDb();
  return database.prepare("DELETE FROM scores").run().changes;
}

function getBackend() {
  return "sqlite";
}

function getStorageLabel() {
  return dbPath;
}

module.exports = {
  initDb,
  closeDb,
  addPlayerScore,
  getTopScores,
  getStandingForEntry,
  getProspectiveStanding,
  evaluateScore,
  clearAllScores,
  getBackend,
  getStorageLabel,
};
