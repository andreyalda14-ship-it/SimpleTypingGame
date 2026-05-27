# Sky Type — Falling Letter Typing Game



A browser typing game: letters fall from the sky and you type them to shoot them down before they cross the danger line. Scores are stored in **PostgreSQL** with player names.



## Setup



Requires **Node.js 20.9+** and a PostgreSQL database (`DATABASE_URL`).



```bash

node -v   # should be v20.x or newer

cp .env.example .env   # set DATABASE_URL (see below)

npm install

npm start

```



Open **http://localhost:8080** in your browser.



### Local PostgreSQL (Docker)



```bash

docker run -d --name skytype-pg -e POSTGRES_PASSWORD=skytype -e POSTGRES_DB=skytype -p 5432:5432 postgres:16

```



In `.env`:



```env

DATABASE_URL=postgresql://postgres:skytype@localhost:5432/skytype

DATABASE_SSL=0

```



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



For production, set `NODE_ENV=production`, use HTTPS in front of the server, and see `.env.example`.



## Deploy (DigitalOcean)



- **[docs/MANAGED-DATABASE.md](docs/MANAGED-DATABASE.md)** — create and connect Managed PostgreSQL

- **[docs/DEPLOY-DIGITALOCEAN.md](docs/DEPLOY-DIGITALOCEAN.md)** — App Platform or Droplet deployment



## Database



| File | Role |

|------|------|

| `db.js` | PostgreSQL pool, schema init, score queries |

| `sql/schema.sql` | Optional manual schema (app auto-creates on start) |

| `lib/validate.js` | Shared input sanitization |

| `server.js` | Express API + static file hosting |



Environment: **`DATABASE_URL`** (required).



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

| `db.js` | Database functions |

| `server.js` | HTTP server |

