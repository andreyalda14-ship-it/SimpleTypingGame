"use strict";

/**
 * Resolved PostgreSQL URL, or null if missing / not expanded (e.g. literal ${db.DATABASE_URL}).
 */
function getDatabaseUrl() {
  const url = (process.env.DATABASE_URL || "").trim();
  if (!url) return null;
  if (url.includes("${")) return null;
  return url;
}

function requireDatabaseUrl() {
  const url = getDatabaseUrl();
  if (url) return url;
  throw new Error(
    "DATABASE_URL is not set or not expanded. On DigitalOcean App Platform: " +
      "open your app → Resources → Add Resource → Database, or set DATABASE_URL " +
      "to the database component reference (e.g. ${your-db-name.DATABASE_URL})."
  );
}

module.exports = { getDatabaseUrl, requireDatabaseUrl };
