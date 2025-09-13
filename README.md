
# Pantry Coach — Phase 1 Starter (PWA + Supabase)

A minimal Next.js app you can deploy for free. Includes:
- Magic link login (Supabase)
- Inventory CRUD (Add, View, Delete)
- Mandatory calories & expiry
- AI expiry auto-fill (shelf-life heuristics)
- PWA (installable on iPhone)

## 1) Configure environment
Copy `.env.local.example` to `.env.local` and set values from Supabase → Project Settings → API:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
For local testing, also add in Supabase → Authentication → URL Configuration → `http://localhost:3000` under Additional Redirect URLs.

## 2) Run locally
```
npm install
npm run dev
```
Open http://localhost:3000

## 3) Deploy
- Push to GitHub
- Import in Vercel → Add env vars → Deploy
- Supabase → Auth → URL Configuration → set Site URL to your Vercel URL

## 4) Install on iPhone
Open your Vercel URL in Safari → Share → Add to Home Screen.

## Notes
- Service Worker caches basic shell. Enhance as needed.
- Icons are included (192, 512, and apple-touch 180).
