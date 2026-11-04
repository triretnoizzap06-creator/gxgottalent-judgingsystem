# GX Got Talent — Judging System

React + Vite + Tailwind, data in Firebase Firestore (real-time for every judge).

## Project structure (flat — every file sits in the repo root)

```
index.html          entry page → loads ./main.jsx
main.jsx            React entry point
App.jsx             all screens (dashboard, scoring, leaderboard, golden ticket, top 5, history, settings)
store.js            Firestore data layer + live listeners
firebase.js         Firebase init from VITE_FIREBASE_* env vars
seed.js             8 judges + 20 performances, written once into an empty database
exportExcel.js      Export Excel (4 sheets)
index.css           Tailwind + custom styles
globalxtreme-logo.png, gx-event-logo.png
vite.config.js, vercel.json, package.json, package-lock.json
firestore.rules     paste into Firebase Console → Firestore → Rules
```

There are no subfolders on purpose, so uploading with GitHub's "Add files via upload" can't lose any paths.

## Deploy

1. **GitHub**: delete the old files in the repo, then upload every file from this ZIP. The 16 visible files are required; `.gitignore` and `.env.example` are optional.
2. **Firebase**: Firestore Database → Create database → Rules → paste `firestore.rules` → Publish.
   Project settings → Your apps → Web app → copy the config.
3. **Vercel** → Project → Settings → Environment Variables, add all six (Production + Preview):
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
   `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
4. Redeploy. Vercel uses `vercel.json` (Vite, `npm run build`, output `dist`).

If the variables are missing, the site shows a "Firebase settings are missing" screen instead of the app.

## Run locally

```bash
npm install
cp .env.example .env   # fill in the Firebase values
npm run dev
```
