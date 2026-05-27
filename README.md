# Sky Type — Falling Letter Typing Game

A browser typing game: letters fall from the sky and you type them to shoot them down before they cross the danger line. Scores are stored in a leaderboard with player names.

## Database by environment

| Environment | Storage | How |
|-------------|---------|-----|
| **Development** | SQLite (`scores.db`) | `npm run dev` — no `DATABASE_URL` needed |
| **Production** | PostgreSQL | `NODE_ENV=production` + `DATABASE_URL` |

The same **Express** server (`server.js`) runs in both modes.

## Setup (local dev)

Requires **Node.js 20.x** (see `.nvmrc`). Use the same Node version for `npm install` and `npm run dev`.

```bash
node -v    # should be v20.x
npm install
npm run dev
```

`npm run dev` rebuilds the SQLite native module automatically when needed. If rebuild fails, **stop all running servers/debug sessions**, then:

```bash
npm run rebuild:native
npm run dev
```

Open **http://localhost:8080**. Scores are saved to `scores.db` in the project folder.

### Optional: test PostgreSQL locally

Set `DATABASE_URL` in `.env` (leave `NODE_ENV` unset or `development`). The app will use Postgres instead of SQLite.

## Production

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:25060/skytype?sslmode=require
TRUST_PROXY=1
```

```bash
npm ci --omit=dev
npm start
```

See **[docs/MANAGED-DATABASE.md](docs/MANAGED-DATABASE.md)** and **[docs/DEPLOY-DIGITALOCEAN.md](docs/DEPLOY-DIGITALOCEAN.md)** for DigitalOcean.

## How to play

1. Enter your **player name** on the start screen (letters, numbers, spaces, `.` `_` `-` only).
2. Click **Start Game**.
3. Type the character on each falling block to destroy it.
4. Click **Pause** or press **Esc** to pause or resume. When the game ends, your score is saved automatically.

## Security

| Layer | Protection |
|-------|------------|
| **Static files** | Only `public/` is served — `server.js` and `db.js` are not exposed |
| **Headers** | Helmet (CSP, XSS filter, frame denial, etc.) |
| **API** | Rate limits, JSON size cap (1 KB), input validation |
| **Database** | Parameterized SQL queries (no SQL injection) |
| **Client** | Safe DOM updates (no `innerHTML` for leaderboard), name pattern validation |
| **Crawlers** | `robots.txt` + `noindex` headers |

## Database files

| File | Role |
|------|------|
| `db.js` | Picks SQLite (dev) or PostgreSQL (production) |
| `db/sqlite.js` | Local SQLite |
| `db/postgres.js` | Production PostgreSQL |
| `sql/schema.sql` | Optional manual Postgres schema |
| `scores.db` | Local dev database (gitignored) |

### API

- `POST /api/scores` — body: `{ "name": "Alice", "score": 12500 }` (rate limited)
- `GET /api/scores` — top 10 highest scores for the leaderboard

### Clear scores

```bash
npm run clear-scores
```

## Files

| File | Purpose |
|------|---------|
| `public/` | Game UI and client scripts (web root) |
| `server.js` | Express HTTP server |
