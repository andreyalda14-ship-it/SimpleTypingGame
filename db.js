/**
 * Database facade: PostgreSQL in production, SQLite for local development.
 */

const { getDatabaseUrl } = require("./lib/database-url");

let driver;

function selectDriver() {
  const isProduction = process.env.NODE_ENV === "production";
  const databaseUrl = getDatabaseUrl();

  if (isProduction) {
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is required when NODE_ENV=production (PostgreSQL)"
      );
    }
    return require("./db/postgres");
  }

  if (databaseUrl) {
    return require("./db/postgres");
  }

  return require("./db/sqlite");
}

function getDriver() {
  if (!driver) {
    driver = selectDriver();
  }
  return driver;
}

module.exports = {
  initDb: () => getDriver().initDb(),
  closeDb: () => getDriver().closeDb(),
  addPlayerScore: (...args) => getDriver().addPlayerScore(...args),
  getTopScores: (...args) => getDriver().getTopScores(...args),
  getStandingForEntry: (...args) => getDriver().getStandingForEntry(...args),
  getProspectiveStanding: (...args) =>
    getDriver().getProspectiveStanding(...args),
  evaluateScore: (...args) => getDriver().evaluateScore(...args),
  clearAllScores: (...args) => getDriver().clearAllScores(...args),
  getBackend: () => getDriver().getBackend(),
  getStorageLabel: () => getDriver().getStorageLabel(),
};
