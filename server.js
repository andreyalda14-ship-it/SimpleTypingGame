const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const {
  initDb,
  addPlayerScore,
  getTopScores,
  getStandingForEntry,
  evaluateScore,
  getBackend,
  getStorageLabel,
} = require("./db");
const { LEADERBOARD_TOP } = require("./lib/validate");

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, "public");
const isProduction = process.env.NODE_ENV === "production";

if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'"],
        imgSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
  })
);

app.use((req, res, next) => {
  res.setHeader(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet, noimageindex"
  );
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(express.json({ limit: "1kb", strict: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again later." },
});

const scorePostLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many score submissions. Try again later." },
});

app.use("/api", apiLimiter);

app.post("/api/scores", scorePostLimiter, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({ error: "Invalid request body" });
    }
    const { name, score } = req.body;
    const result = await evaluateScore(score);
    if (!result.qualifies) {
      return res.status(400).json({ error: "Score does not qualify for the leaderboard" });
    }
    const row = await addPlayerScore(name, score);
    const standing = await getStandingForEntry(row.id);
    res.status(201).json({ ...row, standing });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/scores", async (req, res) => {
  try {
    res.json(await getTopScores(LEADERBOARD_TOP));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/scores/standing", async (req, res) => {
  try {
    res.json(await evaluateScore(req.query.score));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.use(
  express.static(PUBLIC_DIR, {
    dotfiles: "deny",
    index: "index.html",
    fallthrough: false,
  })
);

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  if (err.status === 404) {
    return res.status(404).json({ error: "Not found" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Sky Type server running at http://localhost:${PORT}`);
      console.log(`Database (${getBackend()}): ${getStorageLabel()}`);
    });
  })
  .catch((err) => {
    console.error("Database init failed:", err.message);
    process.exit(1);
  });
