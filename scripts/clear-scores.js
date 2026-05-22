"use strict";

const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "scores.db");
const db = new Database(dbPath);

try {
  const removed = db.prepare("DELETE FROM scores").run().changes;
  console.log(`Cleared ${removed} score record(s) from ${dbPath}.`);
} finally {
  db.close();
}
