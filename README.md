# Sky Type — Falling Letter Shooter

A browser typing game: letters fall from the sky and you type them to shoot them down before they cross the danger line. Scores are stored in a **SQLite** database with player names.

## Setup

Requires **Node.js 20.9+**. Stop the server before reinstalling (`Ctrl+C`), then:

```bash
node -v   # should be v20.x or newer
npm install
npm run rebuild:native   # only if npm start fails with NODE_MODULE_VERSION error
npm start
```

Open **http://localhost:8080** in your browser (required for the API and database).

## How to play

1. Enter your **player name** on the start screen (letters, numbers, spaces, `.` `_` `-` only).
2. Click **Start Game**.
3. Type the character on each falling block to destroy it.
4. Press **Esc** or **P** to pause. When the game ends, your score is saved automatically.

## Security

The app includes several protections:

| Layer | Protection |
|-------|------------|
| **Static files** | Only `public/` is served — `server.js`, `db.js`, and `scores.db` are not exposed |
| **Headers** | Helmet (CSP, XSS filter, frame denial, etc.) |
| **API** | Rate limits, JSON size cap (1 KB), input validation |
| **Database** | Parameterized SQL queries (no SQL injection) |
| **Client** | Safe DOM updates (no `innerHTML` for leaderboard), name pattern validation |
| **Crawlers** | `robots.txt` + `noindex` headers |

For production, set `NODE_ENV=production`, use HTTPS in front of the server, and see `.env.example`.

## Database

| File       | Role                                      |
|------------|-------------------------------------------|
| `db.js`    | SQLite setup and `addPlayerScore()`       |
| `lib/validate.js` | Shared input sanitization          |
| `scores.db`| Database file (created on first run)        |
| `server.js`| Express API + static file hosting           |

### API

- `POST /api/scores` — body: `{ "name": "Alice", "score": 12500 }` (rate limited)
- `GET /api/scores` — top 10 highest scores for the leaderboard

## Files

| File        | Purpose                              |
|-------------|--------------------------------------|
| `public/`   | Game UI and client scripts (web root) |
| `db.js`     | Database functions                   |
| `server.js` | HTTP server                          |
