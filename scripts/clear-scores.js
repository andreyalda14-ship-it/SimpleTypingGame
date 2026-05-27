"use strict";

const {
  initDb,
  clearAllScores,
  closeDb,
  getStorageLabel,
} = require("../db");

(async () => {
  try {
    await initDb();
    const removed = await clearAllScores();
    console.log(
      `Cleared ${removed} score record(s) from ${getStorageLabel()}.`
    );
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
})();
