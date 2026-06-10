/**
 * Predicted-rating engine — K-Means clustering on content features.
 *
 * Clusters are formed on item content (genres, era, quality, type) — NOT on
 * the user's ratings. Once clusters are found, the average rating the user gave
 * to items that fell in each cluster becomes that cluster's "taste mean".
 * An unrated recommended item's predicted rating = its nearest cluster's taste mean.
 *
 * Feature vector per item (all dimensions 0–1):
 *   [genre_0 … genre_17]   18-bit one-hot over GENRE_LIST
 *   [decade_norm]           (floor(year/10) - 195) / 8  →  ~0–1 for 1950s–2030s
 *   [quality]               tmdbVoteAverage / 10
 *   [is_tv]                 1 if mediaType === "tv", else 0
 *
 * Total: 21 dimensions.
 */

const GENRE_LIST = [
  "Action","Adventure","Animation","Comedy","Crime","Documentary",
  "Drama","Family","Fantasy","History","Horror","Music","Mystery",
  "Romance","Sci-Fi","Thriller","War","Western",
];

// ── Feature vector ────────────────────────────────────────────────────────────

function featureVec(item) {
  const genres = item.genres || [];
  const genreBits = GENRE_LIST.map((g) => (genres.includes(g) ? 1 : 0));
  const decade = item.year ? Math.max(0, Math.min(1, (Math.floor(item.year / 10) - 195) / 8)) : 0.5;
  const quality = Math.max(0, Math.min(1, (item.voteAverage || 6) / 10));
  const isTV = item.mediaType === "tv" ? 1 : 0;
  return [...genreBits, decade, quality, isTV];
}

// ── K-Means (Euclidean) ───────────────────────────────────────────────────────

function dist(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function kmeansOnce(points, k) {
  const dim = points[0].length;

  // Random init: pick k distinct points as starting centroids
  const shuffled = [...points].sort(() => Math.random() - 0.5);
  let centroids = shuffled.slice(0, k).map((p) => [...p]);
  let assignments = new Array(points.length).fill(0);

  for (let iter = 0; iter < 60; iter++) {
    // Assign each point to nearest centroid
    let changed = false;
    for (let i = 0; i < points.length; i++) {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = dist(points[i], centroids[c]);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true; }
    }
    if (!changed) break;

    // Recompute centroids
    const sums = Array.from({ length: k }, () => new Array(dim).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i < points.length; i++) {
      const c = assignments[i];
      for (let d = 0; d < dim; d++) sums[c][d] += points[i][d];
      counts[c]++;
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) centroids[c] = sums[c].map((v) => v / counts[c]);
    }
  }

  // Inertia = sum of squared distances to assigned centroid (lower = better)
  const inertia = points.reduce((s, p, i) => s + dist(p, centroids[assignments[i]]) ** 2, 0);

  return { centroids, assignments, inertia };
}

function kmeans(points, k, runs = 5) {
  let best = null;
  for (let r = 0; r < runs; r++) {
    const result = kmeansOnce(points, k);
    if (!best || result.inertia < best.inertia) best = result;
  }
  return best;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build cluster model from the user's rated items.
 * Returns { centroids, clusterMeans, k } or null if not enough data.
 */
export function buildClusterModel(ratingsMap) {
  const items = Object.values(ratingsMap);
  if (items.length < 3) return null;

  // k = floor(n/5), clamped to [2, 6]
  const k = clamp(Math.floor(items.length / 5), 2, 6);

  const points = items.map((item) => featureVec(item));
  const { centroids, assignments } = kmeans(points, k);

  // Average rating per cluster (the "taste mean")
  const ratingSum = new Array(k).fill(0);
  const ratingCount = new Array(k).fill(0);
  for (let i = 0; i < items.length; i++) {
    ratingSum[assignments[i]] += items[i].value;
    ratingCount[assignments[i]]++;
  }
  const clusterMeans = ratingSum.map((s, i) =>
    ratingCount[i] > 0 ? s / ratingCount[i] : 5
  );

  console.log(
    "[Lumen Clusters] k=" + k,
    "| means:", clusterMeans.map((m) => m.toFixed(1)).join(", "),
    "| sizes:", Array.from({ length: k }, (_, c) => assignments.filter((a) => a === c).length).join(", ")
  );

  return { centroids, clusterMeans, k };
}

/**
 * Predict rating for an unrated item given a cluster model.
 * Returns a number rounded to 1 decimal, e.g. 7.3
 */
export function predictRating(item, model) {
  if (!model) return null;
  const vec = featureVec(item);
  let best = 0, bestDist = Infinity;
  for (let i = 0; i < model.centroids.length; i++) {
    const d = dist(vec, model.centroids[i]);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  const raw = model.clusterMeans[best];
  return Math.round(raw * 10) / 10;
}
