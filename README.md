# Home Expense Tracker

A personal, self-hosted expense tracker: multiple bank accounts, credit cards
(spends tracked as a liability you pay down), configurable categories, transfers,
a savings goal tracker, mutual fund investment tracking, a dashboard with
analytics, CSV export, and an encrypted vault for passwords/card details.

- `backend/` — Node.js + Express + Prisma + PostgreSQL API
- `frontend/` — React + Vite + Tailwind + shadcn/ui SPA
- `deploy/` — Docker Compose stack + nginx config + backup script for running
  this on a Raspberry Pi
- `docs/RASPBERRY_PI_SETUP.md` — full walkthrough for deploying to a
  Raspberry Pi 3B+ and reaching it from anywhere via Tailscale

## Local development

```bash
# Backend
cd backend
cp .env.example .env   # fill in DATABASE_URL / JWT_SECRET / VAULT_ENCRYPTION_KEY
npm install
npx prisma migrate dev
npm run dev             # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173, proxies /api to the backend
```

## Production deployment (Raspberry Pi)

See `docs/RASPBERRY_PI_SETUP.md` for the full guide — Docker Compose brings up
Postgres, the API, and the frontend, and Tailscale gives you a private HTTPS URL
reachable from any of your own devices, anywhere.

---

## Legacy: Shopping Cart (previous assignment scaffold)

The section below documents unrelated code that predates this app and still lives
at the repository root (`src/`, root `package.json`, etc.). It is left as-is.

## STACK

- React Js

- Vite

- ShadCn (For UI)

- Lucide React (For Icons)

- Redux (For State management)

  

## STEPS TO RUN

-  `npm i` or `yarn install`

-  `yarn dev` or `npm run dev`

## Personal Details
- Name : PRASANTH.M
- Email : prasanthjohn35@gmail.com
- Linked In : https://www.linkedin.com/in/prasanth-m-674819178
- Contact : 7904111678

<!-- Security scan triggered at 2025-09-02 01:39:53 -->

<!-- Security scan triggered at 2025-09-09 05:31:39 -->

<!-- Security scan triggered at 2025-09-28 15:34:34 -->