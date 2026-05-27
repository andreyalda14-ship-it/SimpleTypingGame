const { Pool } = require("pg");
const {
  sanitizePlayerName,
  sanitizeScore,
  sanitizeLimit,
  LEADERBOARD_TOP,
} = require("./lib/validate");

let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is required (PostgreSQL connection string)"
      );
    }
    pool = new Pool({
      connectionString,
      ssl:
        process.env.DATABASE_SSL === "0"
          ? false
          : process.env.DATABASE_SSL === "1"
            ? { rejectUnauthorized: false }
            : undefined,
    });
  }
  return pool;
}

async function initDb() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      player_name TEXT NOT NULL,
      score INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_scores_leaderboard
    ON scores (score DESC, created_at ASC)
  `);
}

async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * @param {import("pg").QueryResultRow} row
 */
function mapScoreRow(row) {
  return {
    id: row.id,
    playerName: row.playerName,
    score: row.score,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
  };
}

/**
 * @param {string} playerName
 * @param {number} score
 */
async function addPlayerScore(playerName, score) {
  const name = sanitizePlayerName(playerName);
  const points = sanitizeScore(score);
  const db = getPool();

  const { rows } = await db.query(
    `INSERT INTO scores (player_name, score)
     VALUES ($1, $2)
     RETURNING id, player_name AS "playerName", score, created_at AS "createdAt"`,
    [name, points]
  );

  return mapScoreRow(rows[0]);
}

/**
 * @param {number} [limit=10]
 */
async function getTopScores(limit = 10) {
  const safeLimit = sanitizeLimit(limit);
  const db = getPool();

  const { rows } = await db.query(
    `SELECT id, player_name AS "playerName", score, created_at AS "createdAt"
     FROM scores
     ORDER BY score DESC, created_at ASC
     LIMIT $1`,
    [safeLimit]
  );

  return rows.map(mapScoreRow);
}

/**
 * @param {number} id
 * @returns {Promise<number | null>}
 */
async function getStandingForEntry(id) {
  const db = getPool();
  const entryResult = await db.query(
    `SELECT score, created_at AS "createdAt" FROM scores WHERE id = $1`,
    [id]
  );
  const entry = entryResult.rows[0];
  if (!entry) return null;

  const standingResult = await db.query(
    `SELECT COUNT(*)::int + 1 AS standing
     FROM scores
     WHERE score > $1
        OR (score = $2 AND created_at < $3)`,
    [entry.score, entry.score, entry.createdAt]
  );

  return standingResult.rows[0].standing;
}

/**
 * @param {number} score
 * @returns {Promise<number | null>}
 */
async function getProspectiveStanding(score) {
  const points = sanitizeScore(score);
  if (points <= 0) return null;

  const db = getPool();
  const { rows } = await db.query(
    `SELECT COUNT(*)::int + 1 AS standing FROM scores WHERE score > $1`,
    [points]
  );

  return rows[0].standing;
}

/**
 * @param {number} score
 */
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
  const db = getPool();
  const result = await db.query("DELETE FROM scores");
  return result.rowCount;
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
};
