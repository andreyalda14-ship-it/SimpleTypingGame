"use strict";

const { execSync } = require("child_process");
const path = require("path");

// Skip on production / CI / Postgres-only deploys (DigitalOcean App Platform)
if (
  process.env.NODE_ENV === "production" ||
  process.env.CI === "true" ||
  process.env.DATABASE_URL ||
  process.env.SKIP_SQLITE_SETUP === "1"
) {
  process.exit(0);
}

const root = path.join(__dirname, "..");

function loadSqlite() {
  try {
    require.resolve("better-sqlite3");
    const Database = require("better-sqlite3");
    const test = new Database(":memory:");
    test.close();
    return null;
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") return { skip: true };
    return err;
  }
}

function rebuild() {
  console.log(`Rebuilding better-sqlite3 for Node ${process.version}…`);
  execSync("npm rebuild better-sqlite3", {
    cwd: root,
    stdio: "inherit",
  });
}

let err = loadSqlite();

if (err && err.skip) {
  process.exit(0);
}

if (!err) {
  process.exit(0);
}

const needsRebuild =
  err.code === "ERR_DLOPEN_FAILED" ||
  /NODE_MODULE_VERSION|bindings file/i.test(String(err.message));

if (!needsRebuild) {
  console.error(err.message);
  process.exit(1);
}

try {
  rebuild();
} catch {
  console.error(
    "\nRebuild failed. Stop any running server or debug session, then run:\n  npm run rebuild:native\n"
  );
  process.exit(1);
}

err = loadSqlite();
if (err) {
  console.error("SQLite still unavailable after rebuild:", err.message);
  console.error("Run: npm run rebuild:native");
  process.exit(1);
}

console.log("SQLite native module ready.");
