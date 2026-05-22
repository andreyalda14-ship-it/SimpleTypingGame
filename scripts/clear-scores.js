"use strict";

const { clearAllScores, dbPath } = require("../db");

const removed = clearAllScores();
console.log(`Cleared ${removed} score record(s) from ${dbPath}.`);
