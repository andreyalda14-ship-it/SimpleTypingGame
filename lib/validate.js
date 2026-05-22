const MAX_NAME_LENGTH = 32;
const MAX_SCORE = 9_999_999;
const LEADERBOARD_TOP = 10;
const MAX_LEADERBOARD_LIMIT = LEADERBOARD_TOP;
const PLAYER_NAME_RE = /^[\w\s.\-]+$/i;

function sanitizePlayerName(playerName) {
  const name = String(playerName ?? "")
    .trim()
    .slice(0, MAX_NAME_LENGTH);

  if (!name || !PLAYER_NAME_RE.test(name)) {
    throw new Error(
      "Player name must be 1–32 characters (letters, numbers, spaces, . _ -)"
    );
  }

  return name;
}

function sanitizeScore(score) {
  const points = Math.floor(Number(score));

  if (!Number.isFinite(points) || points < 0 || points > MAX_SCORE) {
    throw new Error("Score must be a number between 0 and " + MAX_SCORE);
  }

  return points;
}

function sanitizeLimit(limit) {
  const n = Math.floor(Number(limit) || 10);
  return Math.min(MAX_LEADERBOARD_LIMIT, Math.max(1, n));
}

module.exports = {
  MAX_NAME_LENGTH,
  MAX_SCORE,
  LEADERBOARD_TOP,
  sanitizePlayerName,
  sanitizeScore,
  sanitizeLimit,
};
