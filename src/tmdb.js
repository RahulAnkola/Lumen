const BASE = "https://api.themoviedb.org/3";
const KEY = import.meta.env.VITE_TMDB_API_KEY;
const IMG = "https://image.tmdb.org/t/p/w342";
const IMG_LG = "https://image.tmdb.org/t/p/w500";

function headers() {
  return { Authorization: `Bearer ${KEY}`, accept: "application/json" };
}

export function posterUrl(path, large = false) {
  if (!path) return null;
  return (large ? IMG_LG : IMG) + path;
}

export async function searchMulti(query, signal) {
  if (!query.trim()) return [];
  const res = await fetch(
    `${BASE}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
    { headers: headers(), signal }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || [])
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .slice(0, 8)
    .map(normalizeTmdb);
}

export async function fetchDetails(tmdbId, mediaType) {
  const res = await fetch(`${BASE}/${mediaType}/${tmdbId}?language=en-US`, {
    headers: headers(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return normalizeTmdb({ ...data, media_type: mediaType });
}

export async function fetchSimilar(tmdbId, mediaType, limit = 5) {
  const res = await fetch(
    `${BASE}/${mediaType}/${tmdbId}/recommendations?language=en-US&page=1`,
    { headers: headers() }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || [])
    .slice(0, limit)
    .map((r) => normalizeTmdb({ ...r, media_type: mediaType }));
}

export async function fetchRecommendationsForIds(ratedItems, excludeIds, limit = 18) {
  const topRated = ratedItems
    .filter((r) => r.value >= 55)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  if (!topRated.length) {
    const res = await fetch(`${BASE}/movie/popular?language=en-US&page=1`, {
      headers: headers(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || [])
      .filter((r) => !excludeIds.has(`movie_${r.id}`))
      .slice(0, limit)
      .map((r) => ({ item: normalizeTmdb({ ...r, media_type: "movie" }), because: null }));
  }

  const seen = new Set();
  const results = [];

  await Promise.all(
    topRated.map(async (rated) => {
      const recs = await fetchSimilar(rated.tmdbId, rated.mediaType, 8);
      recs.forEach((item) => {
        const key = `${item.mediaType}_${item.tmdbId}`;
        if (!seen.has(key) && !excludeIds.has(key)) {
          seen.add(key);
          results.push({ item, because: rated });
        }
      });
    })
  );

  return results.slice(0, limit);
}

function normalizeTmdb(r) {
  const isMovie = r.media_type === "movie" || (!r.media_type && r.title);
  return {
    tmdbId: r.id,
    mediaType: isMovie ? "movie" : "tv",
    title: r.title || r.name || "Untitled",
    year: parseInt((r.release_date || r.first_air_date || "0").slice(0, 4)),
    overview: r.overview || "",
    posterPath: r.poster_path || null,
    genres: (r.genres || r.genre_ids || []).map((g) =>
      typeof g === "object" ? g.name : GENRE_MAP[g] || ""
    ).filter(Boolean),
    runtime: isMovie ? (r.runtime || 0) : 0,
    seasons: !isMovie ? (r.number_of_seasons || r.seasons?.length || 1) : 0,
    voteAverage: r.vote_average || 0,
  };
}

const GENRE_MAP = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
  53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News",
  10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap",
  10767: "Talk", 10768: "War & Politics",
};
