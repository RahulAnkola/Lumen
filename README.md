# Lumen

A personal movie and series tracker. Search any title, rate it, and get recommendations based on your taste.

**Live:** [lumen-17b5c.web.app](https://lumen-17b5c.web.app)

## Features

- **Search** — live as-you-type search across movies and series in all languages (powered by TMDB)
- **Rate** — score titles 0–100 with a slider and qualitative tiers (Skip → Essential)
- **Library** — browse everything you've rated with filters by type, genre, and sort order
- **For You** — recommendations tuned to your ratings, with a spotlight top pick
- **Watchlist** — save titles to watch later; they graduate to your library when rated
- **Auth** — Google sign-in or email/password; data syncs across devices via Firestore

## Stack

- React + Vite
- Firebase (Auth, Firestore, Hosting)
- TMDB API

## Local development

1. Clone the repo
2. `npm install`
3. Create a `.env` file (see `.env.example`)
4. `npm run dev`

## Deploy

```bash
npm run build
firebase deploy
```
