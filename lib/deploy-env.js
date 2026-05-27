"use strict";

const { getDatabaseUrl } = require("./database-url");

function validateDeployEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const url = getDatabaseUrl();
  if (!url) {
    console.error(
      "[SkyType] FATAL: Production requires a valid DATABASE_URL (PostgreSQL).\n" +
        "  DigitalOcean: App → Settings → attach a database under Resources, or add\n" +
        "  DATABASE_URL = ${your-database-component.DATABASE_URL}\n" +
        "  Also set NODE_ENV=production and TRUST_PROXY=1"
    );
    process.exit(1);
  }

  if (process.env.TRUST_PROXY !== "1") {
    console.warn(
      "[SkyType] Warning: set TRUST_PROXY=1 for correct rate limits behind App Platform."
    );
  }
}

module.exports = { validateDeployEnv };
