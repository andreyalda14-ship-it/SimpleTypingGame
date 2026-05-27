# Deploy SkyType on DigitalOcean

SkyType uses **PostgreSQL** (`DATABASE_URL`). Create a [Managed Database](MANAGED-DATABASE.md) first, then deploy the app.

---

## 1. Managed PostgreSQL

Follow **[docs/MANAGED-DATABASE.md](MANAGED-DATABASE.md)** to:

- Create a PostgreSQL cluster
- Add a `skytype` database (optional)
- Configure **trusted sources**
- Copy the **connection string** for `DATABASE_URL`

---

## 2. App Platform (recommended with managed DB)

1. Push the repo to GitHub.
2. **Create App** → connect the repo → **Node.js** component.
3. **Build command:** `npm ci`
4. **Run command:** `npm start`
5. **HTTP port:** `8080`
6. **Environment variables:**
   - `DATABASE_URL` — connection string (encrypted)
   - `NODE_ENV` = `production`
   - `TRUST_PROXY` = `1`
7. **Add database resource:** App → **Create** → **Add Resource** → your PostgreSQL cluster (can auto-set `DATABASE_URL`).
8. Deploy → open the app URL.

Scores persist across redeploys because they live in the managed database.

---

## 3. Droplet + PM2 + nginx

### Create Droplet

1. [New Droplet](https://cloud.digitalocean.com/droplets/new) — Ubuntu 22.04.
2. Add SSH key; point domain **A record** at the IP.

### Server setup

```bash
apt update && apt upgrade -y
apt install -y git nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
adduser --disabled-password --gecos "" skytype
```

### Deploy app

```bash
sudo -u skytype -i
cd ~
git clone https://github.com/YOUR_USER/SkyType.git
cd SkyType
npm ci --omit=dev
```

Create `~/SkyType/.env` (use your managed DB connection string):

```env
NODE_ENV=production
PORT=8080
TRUST_PROXY=1
DATABASE_URL=postgresql://doadmin:PASSWORD@host:25060/skytype?sslmode=require
```

Add the Droplet to the database **trusted sources**, then:

```bash
set -a && source .env && set +a
pm2 start ecosystem.config.cjs
pm2 save
exit
```

PM2 on boot (as root):

```bash
env PATH=$PATH:/usr/bin pm2 startup systemd -u skytype --hp /home/skytype
sudo -u skytype pm2 save
```

### Nginx + HTTPS

```bash
cp /home/skytype/SkyType/deploy/nginx-skytype.conf.example /etc/nginx/sites-available/skytype
nano /etc/nginx/sites-available/skytype   # set server_name
ln -s /etc/nginx/sites-available/skytype /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx -d your-domain.com
```

---

## 4. Updates

```bash
sudo -u skytype -i
cd ~/SkyType && git pull && npm ci --omit=dev
set -a && source .env && set +a
pm2 restart skytype
```

---

## Checklist

- [ ] PostgreSQL cluster created
- [ ] Trusted sources include App Platform or Droplet
- [ ] `DATABASE_URL` set on the app
- [ ] `TRUST_PROXY=1` behind nginx or App Platform
- [ ] Game loads; scores survive `pm2 restart` or App Platform redeploy
