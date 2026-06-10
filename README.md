# Lumen

A personal movie and series tracker. Search any title, rate it, and get recommendations tuned to your exact taste — driven by a multi-source engine, a local K-Means clustering model, and Gemini AI.

**Live:** [lumen-17b5c.web.app](https://lumen-17b5c.web.app)

---

## Features

- **Search** — live as-you-type search across movies and series in all languages (TMDB)
- **Rate** — score titles 0–10 with a slider; qualitative tiers (Skip → Essential) surface automatically
- **Library** — browse everything you've rated with filters by type, genre, and sort order
- **For You** — multi-source recommendations sorted by predicted rating, with a spotlight top pick
- **Watchlist** — save titles to watch later; they graduate to your library when rated
- **Where to watch** — streaming and rental availability per title, by region (TMDB watch providers)
- **Auth** — Google sign-in; data syncs across devices via Firestore

---

## How the recommendations work

The For You page pulls from five parallel sources and blends them with a scoring function. Results are cached in `localStorage` for 24 hours — you can force a refresh with the Refresh button.

### 1. TMDB Similar (baseline)

For each of your top-rated titles, TMDB's `/similar` endpoint returns titles it considers related. This is the broadest, fastest source and anchors the pool in familiar territory.

### 2. Keyword Discover

The engine extracts the TMDB keyword IDs from your top-rated titles (via `append_to_response=keywords`), picks the most common ones, and runs a `/discover` query filtered to those keywords. This finds films that share specific thematic DNA with what you loved — not just genre, but things like "psychological thriller" or "based on a true story."

### 3. Genre/Era Discover

A taste profile is built from your full ratings history:
- **Genre affinity** — each genre is scored by the average rating you gave titles in it, weighted by how many you've rated. Genres you consistently rate high score higher.
- **Era affinity** — your ratings are bucketed by decade. The decades you rate highest get boosted in discovery.
- **Language affinity** — original languages of your top-rated titles are tracked and used to surface non-English content you're likely to enjoy.

A TMDB `/discover` call is issued with your top genres and eras as filters.

### 4. Director filmography

Directors of your top 8 rated titles are extracted from credits. The three you've rated highest get their full filmographies fetched from `/person/{id}/combined_credits`. Titles you haven't seen yet from directors you demonstrably love are strong candidates. The director boost multiplier is ×2.0 in the scoring function.

### 5. Actor filmography

Same approach as directors, for actors. Your most-loved performers' other work is fetched and surfaced. Actor boost is ×2.5 (slightly higher than directors because lead actors tend to correlate more tightly with personal taste in most rating profiles). A per-person cap of 2 titles prevents any one performer from flooding the list.

### 6. Gemini AI suggestions

A structured prompt is sent to Gemini 2.5 Flash describing your top-rated titles, your genre/era/language profile, and what you've already seen. Gemini returns 8–12 specific title suggestions with a one-line reason for each. These are resolved against TMDB for poster/metadata and injected into the pool with a +3.0 source boost, making them strong competitors. The response is parsed defensively — Gemini 2.5's thinking-mode output is stripped before JSON extraction. If no Gemini key is set, this source is silently skipped.

### Scoring function

Every candidate from all sources is scored:

```
score = genre_affinity × 1.8
      + era_affinity × 0.4
      + quality_score × 0.7      ← TMDB vote average, normalised
      + director_affinity × 2.0  ← if from director source
      + actor_affinity × 2.5     ← if from actor source
      + gemini_boost × 3.0       ← if from Gemini
      + keyword_boost × 0.8      ← if from keyword discover
```

The pool is split into movies and series separately, guaranteeing a mix. A title already in your library, watchlist, or dismissed list is excluded before scoring.

---

## Predicted ratings (K-Means clustering)

Each recommendation card shows a predicted rating — what you'd likely give it if you watched it — calculated entirely client-side with no external calls.

### How it works

1. **Feature vectors** — every title you've rated is encoded as a 21-dimensional vector:
   - 18 binary genre flags (one-hot over Action, Crime, Drama, etc.)
   - Decade (normalised 0–1, covering 1950s–2030s)
   - TMDB vote average (normalised 0–1)
   - Is-TV flag (0 or 1)

2. **K-Means clustering** — the vectors are clustered using standard Euclidean K-Means. `k` is set to `floor(n / 5)`, clamped to [2, 6] — so with 15 ratings you get 3 clusters, with 30 you get 6. The algorithm runs 5 times with random initialisation and keeps the result with the lowest inertia (tightest clusters), avoiding local optima.

3. **Cluster taste means** — once clusters are found, the average rating you gave to items in each cluster becomes that cluster's "taste mean". Crucially, the clusters are formed on content features only, not on your ratings — ratings are only used after the fact to label each cluster.

4. **Prediction** — for any unrated title, its feature vector is computed, the nearest centroid is found by Euclidean distance, and that cluster's taste mean is returned as the predicted rating (rounded to one decimal).

The model rebuilds whenever your ratings change. Because it runs entirely in-browser in pure JS, there's no API call, no latency, and no data leaving your device.

---

## Stack

- React 18 + Vite 5
- Firebase (Auth, Firestore, Hosting, Analytics)
- TMDB API — search, details, credits, keywords, watch providers
- Gemini 2.5 Flash — AI recommendation suggestions
- Pure JS K-Means — local predicted-rating model

---

## Local development

1. Clone the repo
2. `npm install`
3. Create a `.env` file:

```
VITE_TMDB_API_KEY=your_tmdb_key
VITE_GEMINI_API_KEY=your_gemini_key          # optional — skipped if absent
VITE_WATCH_REGION=IN                         # optional — defaults to IN

VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

4. `npm run dev`

## Deploy

```bash
npm run build
firebase deploy
```
