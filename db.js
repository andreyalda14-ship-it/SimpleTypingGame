/**
 * Database facade: PostgreSQL in production, SQLite for local development.
 */

let driver;

function selectDriver() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is required when NODE_ENV=production. " +
          "On DigitalOcean App Platform: link your PostgreSQL database under Resources " +
          "or add DATABASE_URL (e.g. ${your-db.DATABASE_URL}) in Environment Variables."
      );
    }
    return require("./db/postgres");
  }

  if (process.env.DATABASE_URL) {
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
