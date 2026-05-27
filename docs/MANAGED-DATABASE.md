# DigitalOcean Managed PostgreSQL for SkyType

SkyType stores leaderboard scores in **PostgreSQL** via `DATABASE_URL`.

---

## 1. Create the database cluster

1. Open [DigitalOcean Databases](https://cloud.digitalocean.com/databases).
2. **Create Database Cluster** → choose **PostgreSQL** (v16 recommended).
3. Pick a region **close to your app** (same region as Droplet or App Platform).
4. Choose a plan (Dev database is fine to start).
5. Name the cluster (e.g. `skytype-db`).

---

## 2. Create a dedicated database (optional)

The cluster ships with a default database (`defaultdb`). For a clean setup:

1. Open the cluster → **Users & Databases**.
2. Under **Databases**, click **Add database**.
3. Name it `skytype` (or any name you prefer).

You can also use `defaultdb` and skip this step.

---

## 3. Allow your app to connect

Under **Settings** → **Trusted sources**, add:

| Where the app runs | What to add |
|--------------------|-------------|
| **App Platform** | Choose **App Platform** and select your app (or allow all App Platform apps in the same account). |
| **Droplet** | Add the Droplet’s IP or “All resources in this account”. |
| **Local dev** | Temporarily add your home IP, or use `doctl databases connection` with a tunnel. |

Without a trusted source, connections are refused.

---

## 4. Get the connection string

1. Cluster page → **Connection details**.
2. Select **Connection string** (not “Private” unless your app is in the same VPC).
3. Copy the URI. It looks like:

   ```
   postgresql://doadmin:PASSWORD@db-postgresql-nyc3-12345.db.ondigitalocean.com:25060/skytype?sslmode=require
   ```

4. Set it as **`DATABASE_URL`** on your app (never commit it to git).

The app creates the `scores` table automatically on startup (`initDb()`). You can also run `sql/schema.sql` manually in the cluster’s **SQL console** if you prefer.

---

## 5. Wire it to your app

### App Platform

1. Create or edit your app → **Settings** → **App-Level Environment Variables** (or component env).
2. Add:
   - `DATABASE_URL` = (paste connection string, mark **Encrypted**)
   - `NODE_ENV` = `production`
   - `TRUST_PROXY` = `1`
3. Under **Resources**, use **Add Resource** → **Database** to link the managed cluster (DigitalOcean can inject `DATABASE_URL` for you).
4. Redeploy.

### Droplet (PM2)

On the server, in `~/SkyType/.env`:

```env
NODE_ENV=production
PORT=8080
TRUST_PROXY=1
DATABASE_URL=postgresql://doadmin:PASSWORD@host:25060/skytype?sslmode=require
```

Then:

```bash
set -a && source .env && set +a
pm2 restart skytype
```

---

## 6. Local development

Run Postgres locally (Docker example):

```bash
docker run -d --name skytype-pg -e POSTGRES_PASSWORD=skytype -e POSTGRES_DB=skytype -p 5432:5432 postgres:16
```

Create `.env` from `.env.example`:

```env
DATABASE_URL=postgresql://postgres:skytype@localhost:5432/skytype
DATABASE_SSL=0
PORT=8080
```

```bash
npm install
npm start
```

---

## 7. Clear all scores

```bash
# DATABASE_URL must be set (from .env or export)
npm run clear-scores
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `DATABASE_URL is required` | Set the env var before `npm start`. |
| `ECONNREFUSED` / timeout | Add app IP or App Platform to **Trusted sources**. |
| `SSL required` | Use the DO connection string with `?sslmode=require`. |
| `password authentication failed` | Reset user password in cluster → Users, update `DATABASE_URL`. |
| `database "skytype" does not exist` | Create the database in **Users & Databases**, or use `defaultdb` in the URL path. |

---

## Migrating old SQLite scores

If you had data in `scores.db`, export and import manually (one-time):

```bash
# On a machine with sqlite3 and psql installed
sqlite3 scores.db -header -csv "SELECT player_name, score, created_at FROM scores;" > scores.csv
```

Then load into Postgres with a small script or SQL `COPY` after adjusting column names. New installs can skip this.
