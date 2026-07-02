# Running the Expense Tracker on a Raspberry Pi 3B+

This app is a small monorepo:

```
backend/    Node.js + Express + Prisma + PostgreSQL API
frontend/   React + Vite SPA (served by nginx in production, proxies /api to backend)
deploy/     docker-compose.yml, nginx.conf, backup script, .env.example
```

It's designed to run as three Docker containers (Postgres, backend, nginx+frontend) on
your Pi, reachable from anywhere via **Tailscale** — no port forwarding, no exposed
public IP, no certificates to manage by hand.

## 1. Flash the Pi

1. Use [Raspberry Pi Imager](https://www.raspberrypi.com/software/) to flash
   **Raspberry Pi OS Lite (64-bit)** to a microSD card (32GB+ recommended). The 64-bit
   OS is required — Docker images here are built for `linux/arm64`.
2. In the Imager's advanced options (gear icon), enable SSH, set a hostname
   (e.g. `expense-pi`), and set your username/password before writing the card.
3. Boot the Pi, then SSH in: `ssh <user>@expense-pi.local`.

## 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker compose version   # confirm the plugin is present
```

## 3. Install Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Follow the printed link to authenticate the Pi to your Tailscale account. Once
connected, install the Tailscale app on your phone/laptop and log into the same
account — those devices can now reach the Pi from anywhere, over an encrypted
private network, without opening anything on your home router.

## 4. Get the code onto the Pi

```bash
git clone <your-repo-url> expense-tracker
cd expense-tracker
```

## 5. Build the images

A Raspberry Pi 3B+ has only 1GB of RAM, and building the frontend (a Vite/TypeScript
build) and the Prisma-based backend in place can be slow or run out of memory.
Two options:

**Option A — build directly on the Pi (simplest, slower)**

Add swap first so the build doesn't get OOM-killed:

```bash
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

Then build normally (see step 6). Expect the first build to take 15–30 minutes.

**Option B — cross-build on your dev machine, push to a registry (recommended)**

On a faster machine (or in CI) with Docker buildx:

```bash
docker buildx build --platform linux/arm64 -f backend/Dockerfile -t <your-registry>/expense-backend:latest --push .
docker buildx build --platform linux/arm64 -f frontend/Dockerfile -t <your-registry>/expense-frontend:latest --push .
```

Then on the Pi, edit `deploy/docker-compose.yml` to use `image:` instead of `build:`
for both services, and run `docker compose pull` instead of `docker compose build`.

## 6. Configure secrets

```bash
cd deploy
cp .env.example .env
openssl rand -base64 48   # paste into JWT_SECRET
openssl rand -base64 32   # paste into VAULT_ENCRYPTION_KEY
nano .env                  # also set a real POSTGRES_PASSWORD
```

**Back up `VAULT_ENCRYPTION_KEY` somewhere off the Pi** (a password manager, a
written note in a safe place). It encrypts every password/card entry in the Vault
page. If it's lost, that data cannot be recovered — there is no backdoor.

## 7. Start the app

```bash
cd deploy
docker compose build   # skip if you pulled prebuilt images in step 5B
docker compose up -d
docker compose ps       # all three services should show healthy/running
```

The backend automatically applies Prisma migrations on startup (see
`backend/docker-entrypoint.sh`). The app is now listening on port 8080 on the Pi.

Visit `http://<pi-tailscale-ip>:8080` from any device on your tailnet to confirm it
loads, then complete the one-time account setup screen (this app is single-user).

## 8. Expose it over Tailscale with HTTPS

```bash
sudo tailscale serve https / http://localhost:8080
```

This gives you a stable HTTPS URL like `https://expense-pi.<your-tailnet>.ts.net`
with a certificate Tailscale manages automatically — reachable from any device
logged into your tailnet, anywhere in the world, and from nowhere else. Add it to
your phone's home screen for quick access.

To make this persist across reboots:

```bash
sudo tailscale serve --bg https / http://localhost:8080
```

## 9. Keep it running across reboots

Docker's `restart: unless-stopped` (already set in `docker-compose.yml`) brings the
containers back up automatically after a Pi reboot as long as the Docker daemon
starts on boot, which it does by default after `get.docker.com` install.

## 10. Set up nightly backups

```bash
chmod +x deploy/backup.sh
crontab -e
```

Add:

```
0 3 * * * /home/<user>/expense-tracker/deploy/backup.sh >> /home/<user>/expense-tracker/deploy/backup.log 2>&1
```

This dumps Postgres nightly to `deploy/backups/`, gzip'd, keeping 14 days. Periodically
copy that directory somewhere off the Pi (another machine, a USB drive, cloud
storage) — a single SD card failure shouldn't be able to take your financial history
with it.

## 11. Updating the app later

```bash
cd expense-tracker
git pull
cd deploy
docker compose build   # or `docker compose pull` if using prebuilt images
docker compose up -d
```

Migrations run automatically on the backend container's next start.

## Troubleshooting

- `docker compose logs backend` / `... logs frontend` / `... logs postgres` — check
  service logs.
- If the backend can't reach Postgres, confirm `docker compose ps` shows postgres as
  `healthy` before the backend started (compose already waits on this via
  `depends_on: condition: service_healthy`).
- If `tailscale serve` doesn't resolve from another device, confirm that device is
  logged into the *same* Tailscale account/tailnet, and run `tailscale status` on
  the Pi to confirm it's connected.
