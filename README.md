# GX Got Talent — Judging System

Rebuild of gxjudgingsystem.figma.site with React + Vite + Tailwind and Firebase Firestore.

## 1. Logos

Both logos are already in `public/` (`globalxtreme-logo.png` and `gx-event-logo.png`).

## 2. Firebase

1. Firebase Console → create/open a project → **Firestore Database** → Create database.
2. Firestore → **Rules** → paste the contents of `firestore.rules` → Publish.
3. Project settings → Your apps → add a **Web app** → copy the config values.

On first open, the app fills the database automatically with the 8 judges and 20 performances (P01–P20).

Collections used: `judges`, `performances`, `scores`, `settings/state` (Golden Ticket + Top 5).

## 3. GitHub + Vercel

1. Upload all files in this folder (except `node_modules`/`dist`) to the repo `gxgottalent-judgingsystem`.
2. Vercel → project → **Settings → Environment Variables**, add the 6 values from `.env.example` with your Firebase config.
3. Redeploy. Vercel detects Vite automatically (build: `npm run build`, output: `dist`).

## Run locally

```bash
npm install
cp .env.example .env   # fill in the Firebase values
npm run dev
```

Without the Firebase values the app still runs, but data is only saved in that browser.
