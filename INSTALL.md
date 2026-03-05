# TW Connect — Production Install Guide

This guide walks through deploying TW Connect on a Linux VPS (Ubuntu 22.04 LTS recommended).
By the end you'll have a running app behind Nginx with a free SSL certificate, managed by PM2,
with automated daily database backups.

---

## Prerequisites

- A VPS with at least 1 vCPU and 1 GB RAM
- Ubuntu 22.04 (or similar Debian-based distro)
- A domain name pointed at your server's IP (A record)
- SSH access as a non-root user with `sudo` privileges

---

## 1. Install Node.js 20

```bash
# Install via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # should print v20.x.x
```

---

## 2. Install PM2

PM2 keeps the app running and restarts it automatically if it crashes or the server reboots.

```bash
sudo npm install -g pm2
pm2 --version
```

---

## 3. Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 4. Upload the project

Copy the project to your server. The recommended location is `/var/www/tw-connect`.

```bash
# From your local machine:
scp -r tw-connect/ user@your-server-ip:/var/www/

# Or use rsync (faster on subsequent deploys):
rsync -avz --exclude node_modules --exclude .env \
  tw-connect/ user@your-server-ip:/var/www/tw-connect/
```

---

## 5. Install dependencies

SSH into your server, then:

```bash
cd /var/www/tw-connect

# Install server (backend) dependencies
npm install --prefix server --omit=dev

# Install and build the React frontend
npm install --prefix client
npm run build --prefix client
```

The built frontend will be in `client/dist/`. The Express server serves these static files
in production.

---

## 6. Configure environment variables

```bash
cd /var/www/tw-connect
cp .env.example .env
nano .env
```

Set the following (at minimum):

```dotenv
NODE_ENV=production
PORT=3001

# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_long_random_secret_here

# Your domain — must match the Nginx server_name below
CLIENT_ORIGIN=https://crm.yourcompany.com

SESSION_HOURS=8
```

Protect the file:

```bash
chmod 600 .env
```

---

## 7. Create the first admin account

Run this once to create your first login. The script will prompt for name, email, and password.

```bash
cd /var/www/tw-connect
node server/src/db/seed-admin.js
```

- Password must be at least 10 characters
- You can run this again later if you lose admin access (it skips if an admin already exists)

---

## 8. Start the app with PM2

```bash
cd /var/www/tw-connect/server

# Start the server
pm2 start src/server.js --name tw-connect

# Save the process list so it survives reboots
pm2 save

# Set PM2 to start on system boot
pm2 startup
# PM2 will print a command — copy and run it (it starts with "sudo env PATH=...")
```

Check that it's running:

```bash
pm2 status
pm2 logs tw-connect --lines 30
```

---

## 9. Configure Nginx

Create a new Nginx site config:

```bash
sudo nano /etc/nginx/sites-available/tw-connect
```

Paste the contents from `install/nginx.conf` (included in this repo), replacing
`crm.yourcompany.com` with your actual domain.

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/tw-connect /etc/nginx/sites-enabled/
sudo nginx -t          # verify config is valid
sudo systemctl reload nginx
```

---

## 10. Obtain a free SSL certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Replace with your domain and email
sudo certbot --nginx -d crm.yourcompany.com --email you@yourcompany.com --agree-tos --non-interactive

# Certbot automatically edits the Nginx config and sets up auto-renewal.
# Verify renewal works:
sudo certbot renew --dry-run
```

---

## 11. Verify everything works

1. Visit `https://crm.yourcompany.com/login` in your browser
2. Log in with the admin account you created in step 7
3. Check the browser developer tools — the `twc_token` cookie should be `HttpOnly` and `Secure`

---

## 12. Set up automated database backups

The SQLite database lives at `/var/www/tw-connect/database/twconnect.db`.

Create a backup script:

```bash
sudo nano /usr/local/bin/backup-twconnect.sh
```

Paste:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/twconnect"
DB_FILE="/var/www/tw-connect/database/twconnect.db"
DATE=$(date +%Y-%m-%d_%H%M)

mkdir -p "$BACKUP_DIR"

# SQLite hot backup (safe to run while app is live)
sqlite3 "$DB_FILE" ".backup ${BACKUP_DIR}/twconnect-${DATE}.db"

# Keep only the last 30 daily backups
find "$BACKUP_DIR" -name "twconnect-*.db" -mtime +30 -delete

echo "Backup completed: twconnect-${DATE}.db"
```

Make it executable and schedule it with cron:

```bash
sudo chmod +x /usr/local/bin/backup-twconnect.sh

# Edit root's crontab
sudo crontab -e
```

Add this line to run the backup every day at 2 AM:

```
0 2 * * * /usr/local/bin/backup-twconnect.sh >> /var/log/twconnect-backup.log 2>&1
```

To restore from a backup:

```bash
# Stop the app first
pm2 stop tw-connect

# Restore
cp /var/backups/twconnect/twconnect-2025-01-15_0200.db /var/www/tw-connect/database/twconnect.db

# Restart
pm2 start tw-connect
```

---

## Updating the app

```bash
cd /var/www/tw-connect

# Pull latest code (or upload via scp/rsync)
# ...

# Reinstall dependencies if package.json changed
npm install --prefix server --omit=dev

# Rebuild frontend
npm run build --prefix client

# Restart the server (zero-downtime reload)
pm2 reload tw-connect
```

---

## Useful commands

```bash
pm2 status                      # Show process status
pm2 logs tw-connect             # Stream live logs
pm2 logs tw-connect --lines 100 # Last 100 log lines
pm2 restart tw-connect          # Restart the process
pm2 stop tw-connect             # Stop the process
sudo nginx -t                   # Test Nginx config
sudo systemctl reload nginx     # Apply Nginx config changes
```

---

## Troubleshooting

| Problem | What to check |
|---------|---------------|
| "502 Bad Gateway" | `pm2 status` — is the app running? Check `pm2 logs tw-connect` |
| Can't log in | Check `pm2 logs` for errors. Verify `JWT_SECRET` is set in `.env` |
| CORS errors | Ensure `CLIENT_ORIGIN` in `.env` matches your exact domain (with https://) |
| SSL not renewing | Run `sudo certbot renew --dry-run` and check for errors |
| Database locked | Check for multiple processes. Restart with `pm2 restart tw-connect` |
