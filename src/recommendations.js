/**
 * Lumen recommendation engine
 *
 * Phase 1 (parallel):
 *   • Enrich top-rated items: keywords + directors + actors + language (append_to_response)
 *   • TMDB /recommendations from top-5 rated (no enrichment needed, fires immediately)
 *
 * Phase 2 (parallel, after enrichment):
 *   • Gemini        – semantic, thematic, language-aware (keywords + languages in prompt)
 *   • Keyword disc. – TMDB /discover filtered by your thematic keywords, both types
 *   • Director work – other films/shows by directors you've loved
 *   • Actor work    – other films/shows starring actors you see in your loved titles
 *   • Genre disc.   – type-aware genre-filtered fallback (always fetches movie + TV)
 *
 * Console logs: [Lumen Recs] prefix so you can filter in DevTools.
 */

const BASE = "https://api.themoviedb.org/3";
const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const hasGemini = !!GEMINI_KEY;

function th() {
  return { Authorization: `Bearer ${TMDB_KEY}`, accept: "application/json" };
}

// ── Temporal decay ────────────────────────────────────────────────────────────
// Ratings from further in the past count less — taste drifts over time.
// λ = 0.001 → a rating from 2 years ago weighs ~48% of a brand-new rating.

function toMs(ts) {
  if (!ts) return null;
  if (typeof ts.toMillis === "function") return ts.toMillis(); // Firestore Timestamp
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "number") return ts;
  if (ts.seconds) return ts.seconds * 1000; // plain {seconds, nanoseconds} object
  return null;
}

function decayFactor(ratedAt) {
  const ms = toMs(ratedAt);
  if (!ms) return 1.0;
  const days = (Date.now() - ms) / 86_400_000;
  return Math.exp(-0.001 * days);
}

// ── Genre maps ────────────────────────────────────────────────────────────────

const GENRE_MAP = {
  28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",
  99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",
  27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",878:"Sci-Fi",
  10770:"TV Movie",53:"Thriller",10752:"War",37:"Western",
  10759:"Action & Adventure",10762:"Kids",10763:"News",10764:"Reality",
  10765:"Sci-Fi & Fantasy",10766:"Soap",10767:"Talk",10768:"War & Politics",
};

const MOVIE_GENRE_IDS = {
  "Action":28,"Adventure":12,"Animation":16,"Comedy":35,"Crime":80,
  "Documentary":99,"Drama":18,"Family":10751,"Fantasy":14,"History":36,
  "Horror":27,"Music":10402,"Mystery":9648,"Romance":10749,"Sci-Fi":878,
  "Thriller":53,"War":10752,"Western":37,
  "Action & Adventure":28,"Sci-Fi & Fantasy":878,"War & Politics":10752,"Kids":10751,
};

const TV_GENRE_IDS = {
  "Action":10759,"Adventure":10759,"Animation":16,"Comedy":35,"Crime":80,
  "Documentary":99,"Drama":18,"Family":10751,"Fantasy":10765,"History":36,
  "Horror":27,"Music":10402,"Mystery":9648,"Romance":10749,"Sci-Fi":10765,
  "Thriller":53,"War":10768,"Western":37,
  "Action & Adventure":10759,"Sci-Fi & Fantasy":10765,"War & Politics":10768,"Kids":10762,
};

// ── Normaliser ────────────────────────────────────────────────────────────────

function norm(r, mediaType) {
  const isMovie = mediaType === "movie";
  return {
    tmdbId: r.id,
    mediaType,
    title: r.title || r.name || "Untitled",
    year: parseInt((r.release_date || r.first_air_date || "0").slice(0, 4)),
    overview: r.overview || "",
    posterPath: r.poster_path || null,
    genres: (r.genre_ids || r.genres || [])
      .map((g) => (typeof g === "object" ? g.name : GENRE_MAP[g] || ""))
      .filter(Boolean),
    runtime: isMovie ? (r.runtime || 0) : 0,
    seasons: !isMovie ? (r.number_of_seasons || null) : 0,
    voteAverage: r.vote_average || 0,
    originalLanguage: r.original_language || null,
  };
}

// ── TMDB title search (resolves Gemini suggestions to real IDs) ───────────────

async function searchTmdbTitle(title, year, type) {
  try {
    const ep = type === "tv" ? "search/tv" : "search/movie";
    const yk = type === "tv" ? "first_air_date_year" : "year";
    const yp = year ? `&${yk}=${year}` : "";
    const r = await fetch(`${BASE}/${ep}?query=${encodeURIComponent(title)}${yp}&language=en-US`, { headers: th() });
    if (!r.ok) return null;
    const d = await r.json();
    const m = d.results?.[0];
    return m ? norm(m, type === "tv" ? "tv" : "movie") : null;
  } catch { return null; }
}

// ── Phase-1 enrichment ────────────────────────────────────────────────────────
// One TMDB call per item (append_to_response) → keywords + cast + director + language

async function fetchEnrichedItemData(tmdbId, mediaType) {
  try {
    // Fetch credits for both movies AND TV (TV credits = series regulars)
    const r = await fetch(
      `${BASE}/${mediaType}/${tmdbId}?append_to_response=keywords,credits&language=en-US`,
      { headers: th() }
    );
    if (!r.ok) return null;
    const d = await r.json();

    const keywords =
      mediaType === "movie"
        ? (d.keywords?.keywords || [])
        : (d.keywords?.results || []);

    // Directors (movies) / creators (TV)
    const directors =
      mediaType === "movie"
        ? (d.credits?.crew || []).filter((c) => c.job === "Director").map((c) => ({ id: c.id, name: c.name }))
        : (d.created_by || []).map((c) => ({ id: c.id, name: c.name }));

    // Top-5 cast by billing order
    const cast = (d.credits?.cast || []).slice(0, 5).map((c) => ({ id: c.id, name: c.name }));

    return { keywords, directors, cast, originalLanguage: d.original_language || "en" };
  } catch { return null; }
}

// ── Build taste profile (basic + keyword + director + actor + language) ────────

function buildBasicProfile(ratingsMap) {
  const items = Object.values(ratingsMap);
  if (!items.length) return null;

  const genreTotals = {}, genreCounts = {}, eraTotals = {}, eraCounts = {};
  let movieSum = 0, movieCount = 0, tvSum = 0, tvCount = 0;

  for (const item of items) {
    const r = item.value;
    for (const g of item.genres || []) {
      genreTotals[g] = (genreTotals[g] || 0) + r;
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    }
    if (item.year) {
      const d = Math.floor(item.year / 10) * 10;
      eraTotals[d] = (eraTotals[d] || 0) + r;
      eraCounts[d] = (eraCounts[d] || 0) + 1;
    }
    if (item.mediaType === "movie") { movieSum += r; movieCount++; }
    else { tvSum += r; tvCount++; }
  }

  const genreAffinities = {};
  for (const g of Object.keys(genreTotals))
    genreAffinities[g] = genreTotals[g] / genreCounts[g];

  const eraAffinities = {};
  for (const d of Object.keys(eraTotals))
    eraAffinities[+d] = eraTotals[d] / eraCounts[d];

  const topGenres = Object.entries(genreAffinities)
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g);

  return {
    genreAffinities, eraAffinities, topGenres,
    movieCount, tvCount,
    prefersMovies: movieCount > 0 && (tvCount === 0 || movieSum / movieCount >= tvSum / tvCount),
  };
}

async function buildRichProfile(ratingsMap) {
  const basic = buildBasicProfile(ratingsMap);
  const empty = { topKeywords: [], keywordScores: {}, topDirectors: [], directorScores: {}, directorNames: {}, topActors: [], actorScores: {}, actorNames: {}, detectedLanguages: [] };
  if (!basic) return { ...empty };

  const topRated = Object.values(ratingsMap)
    .filter((i) => i.value >= 7)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Also enrich the worst-rated items so their keywords/directors/actors get penalised
  const lowRated = Object.values(ratingsMap)
    .filter((i) => i.value <= 4)
    .sort((a, b) => a.value - b.value) // worst first
    .slice(0, 4);

  const enriched = await Promise.all(
    [...topRated, ...lowRated].map((item) =>
      fetchEnrichedItemData(item.tmdbId, item.mediaType).then((d) => ({
        item,
        d: d || { keywords: [], directors: [], cast: [], originalLanguage: "en" },
      }))
    )
  );

  const keywordScores = {}, keywordNames = {};
  const directorScores = {}, directorNames = {};
  const actorScores = {}, actorNames = {};
  const langCounts = {};

  for (const { item, d } of enriched) {
    const decay = decayFactor(item.ratedAt);

    // Negative ratings are allowed but attenuated to half-magnitude so one bad film
    // can't cancel multiple loved ones with the same keyword/director/actor.
    const rawKw     = (item.value - 6) / 4;
    const rawPerson = (item.value - 5) / 5;
    const kwWeight     = (rawKw     >= 0 ? rawKw     : rawKw     * 0.5) * decay;
    const personWeight = (rawPerson >= 0 ? rawPerson : rawPerson * 0.5) * decay;

    for (const kw of d.keywords) {
      keywordScores[kw.id] = (keywordScores[kw.id] || 0) + kwWeight;
      keywordNames[kw.id] = kw.name;
    }
    for (const dir of d.directors) {
      directorScores[dir.id] = (directorScores[dir.id] || 0) + personWeight;
      directorNames[dir.id] = dir.name;
    }
    for (const actor of d.cast) {
      actorScores[actor.id] = (actorScores[actor.id] || 0) + personWeight;
      actorNames[actor.id] = actor.name;
    }
    if (d.originalLanguage && d.originalLanguage !== "en") {
      langCounts[d.originalLanguage] = (langCounts[d.originalLanguage] || 0) + item.value;
    }
  }

  const topKeywords = Object.entries(keywordScores)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([id, score]) => ({ id: parseInt(id), name: keywordNames[id], score }));

  const topDirectors = Object.entries(directorScores)
    .filter(([, s]) => s >= 0.5)
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([id, score]) => ({ id: parseInt(id), name: directorNames[id], score }));

  // Actors need a slightly higher threshold since many actors appear in many films
  const topActors = Object.entries(actorScores)
    .filter(([, s]) => s >= 0.6)
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([id, score]) => ({ id: parseInt(id), name: actorNames[id], score }));

  const detectedLanguages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([l]) => l);

  console.log(
    "[Lumen Recs] Profile built →",
    `keywords: [${topKeywords.slice(0,5).map(k=>k.name).join(", ")}]`,
    `| directors: [${topDirectors.map(d=>d.name).join(", ")}]`,
    `| actors: [${topActors.map(a=>a.name).join(", ")}]`,
    `| languages: [${detectedLanguages.join(", ") || "en only"}]`
  );

  return {
    ...basic,
    topKeywords, keywordScores,
    topDirectors, directorScores, directorNames,
    topActors, actorScores, actorNames,
    detectedLanguages,
  };
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreCandidate(candidate, profile, opts = {}) {
  if (!profile) return candidate.voteAverage || 5;
  let score = 0;

  const genres = candidate.genres || [];
  if (genres.length) {
    const avg = genres.reduce((s, g) => s + (profile.genreAffinities[g] ?? 5), 0) / genres.length;
    score += avg * 1.8;
  }

  if (candidate.year) {
    const decade = Math.floor(candidate.year / 10) * 10;
    const era = profile.eraAffinities[decade];
    if (era != null) score += (era - 5) * 0.4;
  }

  score += (candidate.voteAverage || 6) * 0.7;

  if (opts.directorAffinity) score += opts.directorAffinity * 2.0;
  if (opts.actorAffinity) score += opts.actorAffinity * 2.5;

  // Type preference only when user has watched both types
  const hasBoth = profile.movieCount > 0 && profile.tvCount > 0;
  if (hasBoth) {
    if (candidate.mediaType === "movie" && profile.prefersMovies) score += 0.3;
    if (candidate.mediaType === "tv" && !profile.prefersMovies) score += 0.3;
  }

  return score;
}

// ── Source: TMDB recommendations ─────────────────────────────────────────────

async function fetchTmdbRecs(tmdbId, mediaType) {
  try {
    const r = await fetch(`${BASE}/${mediaType}/${tmdbId}/recommendations?language=en-US&page=1`, { headers: th() });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.results || []).map((m) => norm(m, mediaType));
  } catch { return []; }
}

// ── Source: Keyword-based discover ───────────────────────────────────────────

async function fetchKeywordDiscover(topKeywords) {
  if (!topKeywords.length) return [];
  const ids = topKeywords.slice(0, 6).map((k) => k.id).join("|");
  const results = [];
  const run = async (type) => {
    try {
      const minV = type === "movie" ? 80 : 40;
      const r = await fetch(
        `${BASE}/discover/${type}?with_keywords=${ids}&sort_by=vote_average.desc&vote_count.gte=${minV}&vote_average.gte=6.5&language=en-US&page=1`,
        { headers: th() }
      );
      if (!r.ok) return;
      const d = await r.json();
      results.push(...(d.results || []).map((m) => norm(m, type)));
    } catch {}
  };
  await Promise.all([run("movie"), run("tv")]);
  return results;
}

// ── Source: Genre discover (always both types, type-aware IDs) ────────────────

async function fetchGenreDiscover(profile) {
  if (!profile?.topGenres?.length) return [];
  const results = [];
  const run = async (type) => {
    const idMap = type === "movie" ? MOVIE_GENRE_IDS : TV_GENRE_IDS;
    const gids = [...new Set(profile.topGenres.map((g) => idMap[g]).filter(Boolean))].slice(0, 3).join(",");
    if (!gids) return;
    try {
      const minV = type === "movie" ? 300 : 100;
      const r = await fetch(
        `${BASE}/discover/${type}?with_genres=${gids}&sort_by=vote_average.desc&vote_count.gte=${minV}&vote_average.gte=6.8&language=en-US&page=1`,
        { headers: th() }
      );
      if (!r.ok) return;
      const d = await r.json();
      results.push(...(d.results || []).map((m) => norm(m, type)));
    } catch {}
  };
  await Promise.all([run("movie"), run("tv")]);
  return results;
}

// ── Source: Director filmography ──────────────────────────────────────────────

async function fetchDirectorWork(personId) {
  try {
    const [mc, tc] = await Promise.all([
      fetch(`${BASE}/person/${personId}/movie_credits?language=en-US`, { headers: th() }).then((r) => r.ok ? r.json() : { crew: [] }),
      fetch(`${BASE}/person/${personId}/tv_credits?language=en-US`, { headers: th() }).then((r) => r.ok ? r.json() : { crew: [] }),
    ]);
    return [
      ...(mc.crew || []).filter((c) => c.job === "Director").map((m) => norm(m, "movie")),
      ...(tc.crew || []).filter((c) => ["Creator", "Series Creator", "Co-Creator", "Executive Producer"].includes(c.job)).map((m) => norm(m, "tv")),
    ];
  } catch { return []; }
}

// ── Source: Actor filmography ─────────────────────────────────────────────────

async function fetchActorWork(personId) {
  try {
    const r = await fetch(`${BASE}/person/${personId}/combined_credits?language=en-US`, { headers: th() });
    if (!r.ok) return [];
    const d = await r.json();
    const cast = d.cast || [];
    const movies = cast
      .filter((c) => c.media_type === "movie" && (c.vote_count || 0) > 80)
      .map((c) => norm(c, "movie"));
    const tvShows = cast
      .filter((c) => c.media_type === "tv" && (c.vote_count || 0) > 40 && (c.episode_count || 0) > 4)
      .map((c) => norm(c, "tv"));
    return [...movies, ...tvShows];
  } catch { return []; }
}

// ── Source: Gemini ────────────────────────────────────────────────────────────

async function fetchGeminiSuggestions(ratingsMap, richProfile) {
  if (!GEMINI_KEY) {
    console.log("[Lumen Recs] Gemini: no API key, skipping");
    return [];
  }

  const items = Object.values(ratingsMap);
  const loved = items.filter((i) => i.value >= 7).sort((a, b) => b.value - a.value).slice(0, 8);
  const disliked = items.filter((i) => i.value <= 4).slice(0, 4);
  if (loved.length < 2) {
    console.log("[Lumen Recs] Gemini: too few loved titles (<2), skipping");
    return [];
  }

  const lovedStr = loved.map((i) => `- ${i.title} (${i.value}/10, ${i.mediaType === "movie" ? "film" : "series"})`).join("\n");
  const keywords = richProfile.topKeywords.slice(0, 8).map((k) => k.name).join(", ");
  const langs = richProfile.detectedLanguages;
  const langLine = langs.length
    ? `\nUser already watches non-English content (${langs.join(", ")}) — suggest more in those languages too.`
    : "\nInclude international cinema in any language if it's a strong thematic fit.";
  const dislikedLine = disliked.length
    ? `\nAvoid anything similar to (disliked): ${disliked.map((i) => i.title).join(", ")}.`
    : "";

  const prompt =
    `You are a world-class film curator. User's taste:\n\n` +
    `Loved:\n${lovedStr}\n\n` +
    `Recurring themes in their content: ${keywords || "varied"}` +
    langLine + dislikedLine + `\n\n` +
    `Curate exactly 12 titles for this person:\n` +
    `• Aim for ~6 movies + ~6 TV shows (adjust for fit)\n` +
    `• Prioritise thematic/tonal alignment over genre labels\n` +
    `• Prefer critically acclaimed or cult classics over mainstream blockbusters\n` +
    `• Do NOT include anything from the loved/disliked lists above\n\n` +
    `Return ONLY valid JSON — no markdown, no preamble:\n` +
    `[{"title":"Title","year":2020,"type":"movie","reason":"one line why this fits"}]\n` +
    `type must be "movie" or "tv".`;

  console.log(
    `[Lumen Recs] Gemini: calling with ${loved.length} loved titles, keywords: [${keywords}]`
  );

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
            thinkingConfig: { thinkingBudget: 0 }, // disable thinking — we just need JSON
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "(no body)");
      console.warn(`[Lumen Recs] Gemini: HTTP ${res.status} — ${errText}`);
      return [];
    }

    const data = await res.json();
    // Gemini 2.5 with thinking enabled splits response across multiple parts —
    // filter out thought parts and join the rest to get the actual output text.
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.filter((p) => !p.thought).map((p) => p.text || "").join("")
      || parts.map((p) => p.text || "").join("");
    console.log("[Lumen Recs] Gemini raw response:", text.slice(0, 300));

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      console.warn("[Lumen Recs] Gemini: could not parse JSON from response");
      return [];
    }

    const suggestions = JSON.parse(match[0]);
    console.log(`[Lumen Recs] Gemini: ${suggestions.length} suggestions → resolving via TMDB`);

    const resolved = await Promise.all(
      suggestions.map(async (s) => {
        const item = await searchTmdbTitle(s.title, s.year, s.type || "movie");
        if (item) console.log(`  [Lumen Recs] Gemini resolved: "${s.title}" → tmdbId ${item.tmdbId}`);
        else console.log(`  [Lumen Recs] Gemini unresolved: "${s.title}"`);
        return item ? { item, reason: s.reason || null } : null;
      })
    );

    const valid = resolved.filter(Boolean);
    console.log(`[Lumen Recs] Gemini: ${valid.length} successfully resolved`);
    return valid;
  } catch (e) {
    console.warn("[Lumen Recs] Gemini: exception —", e.message);
    return [];
  }
}

// ── Gemini embeddings ─────────────────────────────────────────────────────────
// Uses text-embedding-004 to score candidates by semantic similarity to loved
// items. Runs as a post-scoring pass on the top-60 candidates so it refines
// the ranking without adding more API surface for low-scoring items.
//
// In-memory cache survives the session (cleared on page reload). Since recs
// are cached 24 h in localStorage, embeddings are only fetched on manual refresh.

const _embCache = new Map(); // `${mediaType}_${tmdbId}` → Float32Array

function itemText(item) {
  const genres = (item.genres || []).join(", ");
  const overview = (item.overview || "").slice(0, 300);
  return `${item.title} (${item.year}). ${genres}. ${overview}`.trim();
}

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

async function batchEmbed(entries) {
  // entries: [{ key, text }] — skips anything already in _embCache
  const toFetch = entries.filter(({ key }) => !_embCache.has(key));
  if (!toFetch.length) return;

  // batchEmbedContents supports up to 100 items per call
  const CHUNK = 100;
  for (let i = 0; i < toFetch.length; i += CHUNK) {
    const chunk = toFetch.slice(i, i + CHUNK);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: chunk.map(({ text }) => ({
              model: "models/text-embedding-004",
              content: { parts: [{ text }] },
              taskType: "SEMANTIC_SIMILARITY",
            })),
          }),
        }
      );
      if (!res.ok) {
        console.warn(`[Lumen Recs] Embeddings: HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      (data.embeddings || []).forEach(({ values }, idx) => {
        if (values) _embCache.set(chunk[idx].key, new Float32Array(values));
      });
    } catch (e) {
      console.warn("[Lumen Recs] Embeddings: exception —", e.message);
    }
  }
}

async function applyEmbeddingBoosts(candidates, lovedItems) {
  if (!GEMINI_KEY || !lovedItems.length || !candidates.length) return;

  // Only re-rank the top 60 — low-scorers are unlikely to break through anyway
  const top = candidates.slice(0, 60);

  const lovedEntries = lovedItems.map((i) => ({
    key: `${i.mediaType}_${i.tmdbId}`,
    text: itemText(i),
  }));
  const candidateEntries = top.map((c) => ({
    key: `${c.item.mediaType}_${c.item.tmdbId}`,
    text: itemText(c.item),
  }));

  // Deduplicate before fetching
  const allEntries = [...new Map(
    [...lovedEntries, ...candidateEntries].map((e) => [e.key, e])
  ).values()];

  await batchEmbed(allEntries);

  // Precompute weighted loved embeddings (rating-decay weighted average)
  const lovedVecs = lovedItems
    .map((i) => {
      const emb = _embCache.get(`${i.mediaType}_${i.tmdbId}`);
      const w = Math.max(0, (i.value - 5) / 5) * decayFactor(i.ratedAt);
      return emb ? { emb, w } : null;
    })
    .filter(Boolean);

  const totalW = lovedVecs.reduce((s, { w }) => s + w, 0);
  if (!totalW) return;

  let boosted = 0;
  for (const c of top) {
    const cEmb = _embCache.get(`${c.item.mediaType}_${c.item.tmdbId}`);
    if (!cEmb) continue;

    // Weighted average cosine similarity to all loved items
    const sim = lovedVecs.reduce((s, { emb, w }) => s + cosineSim(cEmb, emb) * w, 0) / totalW;

    // sim is typically 0.4–0.85 for relevant content; boost range ~1.2–3.4
    c.score += sim * 4.0;
    boosted++;
  }

  console.log(`[Lumen Recs] Embeddings: boosted ${boosted}/${top.length} candidates`);
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function getRecommendations(ratingsMap, excludeIds, dismissedMap = {}, limit = 18) {
  const items = Object.values(ratingsMap);
  console.log(`[Lumen Recs] Starting — ${items.length} rated items, ${Object.keys(dismissedMap).length} dismissed`);

  // ── Dismissed language penalties ───────────────────────────────────────────
  // Languages the user has actively rated (so they know & like that language)
  const ratedLanguages = new Set(
    items.map((i) => i.originalLanguage).filter((l) => l && l !== "en")
  );

  // blacklistLangs: dismissed in a language never rated → user likely doesn't
  //   understand or want it → strong penalty for ALL other items in that language
  // softPenaltyCount: dismissed in a known language → mild per-dismissal penalty
  const blacklistLangs = new Set();
  const softPenaltyCount = {}; // lang → number of dismissals

  for (const d of Object.values(dismissedMap)) {
    const lang = d.originalLanguage;
    if (!lang || lang === "en") continue; // English: no language-level penalty
    if (ratedLanguages.has(lang)) {
      softPenaltyCount[lang] = (softPenaltyCount[lang] || 0) + 1;
    } else {
      blacklistLangs.add(lang);
    }
  }

  if (blacklistLangs.size || Object.keys(softPenaltyCount).length) {
    console.log(
      "[Lumen Recs] Language penalties —",
      `blacklist: [${[...blacklistLangs].join(", ")}]`,
      `| soft (dismissal count): ${JSON.stringify(softPenaltyCount)}`
    );
  }

  // Cold start
  if (!items.length) {
    try {
      const r = await fetch(`${BASE}/movie/popular?language=en-US&page=1`, { headers: th() });
      if (r.ok) {
        const d = await r.json();
        return (d.results || []).filter((m) => !excludeIds.has(`movie_${m.id}`)).slice(0, limit)
          .map((m) => ({ item: norm(m, "movie"), because: null, source: "popular" }));
      }
    } catch {}
    return [];
  }

  const topRated = items.filter((i) => i.value >= 7).sort((a, b) => b.value - a.value).slice(0, 5);

  // ── Phase 1: enrichment + TMDB recs in parallel ────────────────────────────
  const [richProfile, tmdbRecBatches] = await Promise.all([
    buildRichProfile(ratingsMap),
    Promise.all(topRated.map((item) =>
      fetchTmdbRecs(item.tmdbId, item.mediaType).then((recs) => ({ source: item, recs }))
    )),
  ]);

  // ── Phase 2: all enrichment-dependent sources in parallel ──────────────────
  const directorFetches = richProfile.topDirectors.map((dir) =>
    fetchDirectorWork(dir.id).then((works) => ({
      personId: dir.id, personName: dir.name, affinity: dir.score, works, kind: "director",
    }))
  );

  const actorFetches = richProfile.topActors.map((actor) =>
    fetchActorWork(actor.id).then((works) => ({
      personId: actor.id, personName: actor.name, affinity: actor.score, works, kind: "actor",
    }))
  );

  const [geminiResults, keywordCandidates, discoverCandidates, ...personBatches] =
    await Promise.all([
      fetchGeminiSuggestions(ratingsMap, richProfile),
      fetchKeywordDiscover(richProfile.topKeywords),
      fetchGenreDiscover(richProfile),
      ...directorFetches,
      ...actorFetches,
    ]);

  console.log(
    `[Lumen Recs] Candidates —`,
    `Gemini: ${geminiResults.length}`,
    `| Keyword disc: ${keywordCandidates.length}`,
    `| Genre disc: ${discoverCandidates.length}`,
    `| TMDB recs: ${tmdbRecBatches.reduce((s, b) => s + b.recs.length, 0)}`,
    `| Persons: ${personBatches.map((p) => `${p.personName}(${p.kind}): ${p.works.length}`).join(", ")}`
  );

  // ── Build unified candidate pool ───────────────────────────────────────────
  const seen = new Set();
  const candidates = [];

  const add = (item, because, source, scoreBoost = 0, meta = {}) => {
    if (!item?.tmdbId || !item.title) return;
    const key = `${item.mediaType}_${item.tmdbId}`;
    if (seen.has(key) || excludeIds.has(key)) return;
    seen.add(key);
    candidates.push({ item, because, source, score: scoreCandidate(item, richProfile, meta) + scoreBoost, ...meta });
  };

  // Gemini: +3 boost
  for (const { item, reason } of geminiResults) add(item, null, "gemini", 3.0, { reason });

  // Director + actor filmography
  for (const { personId, personName, affinity, works, kind } of personBatches) {
    for (const item of works) {
      const opts = kind === "director"
        ? { directorId: personId, directorName: personName, directorAffinity: affinity }
        : { actorId: personId, actorName: personName, actorAffinity: affinity };
      add(item, null, kind, 0, opts);
    }
  }

  // Keyword discover: +0.8
  for (const item of keywordCandidates) add(item, null, "keyword", 0.8);

  // TMDB recs with attribution
  for (const { source, recs } of tmdbRecBatches) {
    for (const item of recs) add(item, source, "tmdb-rec");
  }

  // Genre discover: fill
  for (const item of discoverCandidates) add(item, null, "discover");

  // ── Apply dismissed language penalties ─────────────────────────────────────
  for (const c of candidates) {
    const lang = c.item.originalLanguage;
    if (!lang || lang === "en") continue;
    if (blacklistLangs.has(lang)) {
      c.score -= 8.0; // effectively buried — user doesn't know/want this language
    } else if (softPenaltyCount[lang]) {
      // 0.4 per dismissal, capped at -2.0 even with many dismissals
      c.score -= Math.min(softPenaltyCount[lang] * 0.4, 2.0);
    }
  }

  // ── Sort by score ──────────────────────────────────────────────────────────
  candidates.sort((a, b) => b.score - a.score);

  // ── Phase 3: embedding similarity re-rank ──────────────────────────────────
  // Boosts are applied in-place to top-60 candidates, then we re-sort.
  const lovedForEmb = items.filter((i) => i.value >= 7).sort((a, b) => b.value - a.value).slice(0, 8);
  await applyEmbeddingBoosts(candidates, lovedForEmb);
  candidates.sort((a, b) => b.score - a.score); // re-sort after embedding boosts

  // ── Diversity pass ─────────────────────────────────────────────────────────
  // Apply person cap globally first — filler must respect the same cap.
  const personCount = {};
  const capped = [];
  for (const c of candidates) {
    const pid = c.directorId || c.actorId;
    if (pid) {
      const n = personCount[pid] || 0;
      if (n >= 2) continue;
      personCount[pid] = n + 1;
    }
    capped.push(c);
  }

  const moviePool = capped.filter((c) => c.item.mediaType === "movie");
  const tvPool    = capped.filter((c) => c.item.mediaType === "tv");

  // Guarantee at least 30% movies even if user has only rated TV
  const minMovies = Math.ceil(limit * 0.3);
  const minTv = Math.ceil(limit * 0.3);

  const guaranteedMovies = moviePool.slice(0, minMovies);
  const guaranteedTv = tvPool.slice(0, minTv);
  const guaranteedKeys = new Set([
    ...guaranteedMovies.map((c) => `${c.item.mediaType}_${c.item.tmdbId}`),
    ...guaranteedTv.map((c) => `${c.item.mediaType}_${c.item.tmdbId}`),
  ]);

  // Filler comes from the already-capped pool, not raw candidates
  const filler = capped
    .filter((c) => !guaranteedKeys.has(`${c.item.mediaType}_${c.item.tmdbId}`))
    .slice(0, limit - guaranteedKeys.size);

  const final = [...guaranteedMovies, ...guaranteedTv, ...filler];
  final.sort((a, b) => b.score - a.score);
  const result = final.slice(0, limit);

  // ── Final summary log ──────────────────────────────────────────────────────
  const bySource = {};
  for (const c of result) bySource[c.source] = (bySource[c.source] || 0) + 1;
  console.log("[Lumen Recs] Final mix:", JSON.stringify(bySource));
  result.forEach((c) =>
    console.log(
      `  ${c.score.toFixed(1)} [${c.source}] ${c.item.title} (${c.item.year}, ${c.item.mediaType})` +
        (c.reason ? ` — ${c.reason}` : "") +
        (c.directorName ? ` — dir: ${c.directorName}` : "") +
        (c.actorName ? ` — actor: ${c.actorName}` : "") +
        (c.because ? ` — because: ${c.because.title}` : "")
    )
  );

  return result;
}
