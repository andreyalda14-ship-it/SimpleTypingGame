/**
 * Database facade: PostgreSQL in production, SQLite for local development.
 */

function selectDriver() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is required when NODE_ENV=production (PostgreSQL)"
      );
    }
    return require("./db/postgres");
  }

  if (process.env.DATABASE_URL) {
    return require("./db/postgres");
  }

  return require("./db/sqlite");
}

const driver = selectDriver();

module.exports = {
  initDb: () => driver.initDb(),
  closeDb: () => driver.closeDb(),
  addPlayerScore: (...args) => driver.addPlayerScore(...args),
  getTopScores: (...args) => driver.getTopScores(...args),
  getStandingForEntry: (...args) => driver.getStandingForEntry(...args),
  getProspectiveStanding: (...args) => driver.getProspectiveStanding(...args),
  evaluateScore: (...args) => driver.evaluateScore(...args),
  clearAllScores: (...args) => driver.clearAllScores(...args),
  getBackend: () => driver.getBackend(),
  getStorageLabel: () => driver.getStorageLabel(),
};
