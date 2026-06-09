/* Lumen — seed catalog. Real titles/facts used so the UI feels live;
   posters are styled placeholders (wire real art in Claude Code).
   Attached to window.LUMEN. */
(function () {
  // type: 'Movie' | 'Series'
  // tone: base hue (deg) used to tint the poster placeholder
  const C = [
    { id: "blade-runner-2049", title: "Blade Runner 2049", year: 2017, type: "Movie", genres: ["Sci-Fi", "Drama", "Mystery"], runtime: 164, by: "Denis Villeneuve", tone: 28, log: "A young blade runner unearths a secret that could unravel society." },
    { id: "arrival", title: "Arrival", year: 2016, type: "Movie", genres: ["Sci-Fi", "Drama", "Mystery"], runtime: 116, by: "Denis Villeneuve", tone: 165, log: "A linguist races to communicate with visitors before time runs out." },
    { id: "dune", title: "Dune", year: 2021, type: "Movie", genres: ["Sci-Fi", "Adventure", "Drama"], runtime: 155, by: "Denis Villeneuve", tone: 38, log: "A noble heir is drawn into a war for the universe's most precious resource." },
    { id: "interstellar", title: "Interstellar", year: 2014, type: "Movie", genres: ["Sci-Fi", "Adventure", "Drama"], runtime: 169, by: "Christopher Nolan", tone: 220, log: "Explorers travel through a wormhole in search of a new home for humanity." },
    { id: "the-substance", title: "The Substance", year: 2024, type: "Movie", genres: ["Horror", "Thriller", "Sci-Fi"], runtime: 141, by: "Coralie Fargeat", tone: 348, log: "A fading star takes a black-market drug that creates a younger self." },
    { id: "parasite", title: "Parasite", year: 2019, type: "Movie", genres: ["Thriller", "Drama", "Comedy"], runtime: 132, by: "Bong Joon-ho", tone: 130, log: "A poor family schemes to become entangled with a wealthy household." },
    { id: "everything-everywhere", title: "Everything Everywhere All at Once", year: 2022, type: "Movie", genres: ["Sci-Fi", "Comedy", "Adventure"], runtime: 139, by: "Daniels", tone: 300, log: "A laundromat owner must connect with parallel-universe versions of herself." },
    { id: "past-lives", title: "Past Lives", year: 2023, type: "Movie", genres: ["Romance", "Drama"], runtime: 105, by: "Celine Song", tone: 18, log: "Two childhood friends reunite decades later for one fateful week." },
    { id: "the-zone-of-interest", title: "The Zone of Interest", year: 2023, type: "Movie", genres: ["Drama", "History", "War"], runtime: 105, by: "Jonathan Glazer", tone: 95, log: "A commandant and his wife build a dream life beside a death camp." },
    { id: "oppenheimer", title: "Oppenheimer", year: 2023, type: "Movie", genres: ["Drama", "History", "Thriller"], runtime: 180, by: "Christopher Nolan", tone: 30, log: "The story of the man behind the atomic bomb and its reckoning." },
    { id: "anatomy-of-a-fall", title: "Anatomy of a Fall", year: 2023, type: "Movie", genres: ["Thriller", "Drama", "Mystery"], runtime: 151, by: "Justine Triet", tone: 210, log: "A writer stands trial for her husband's mysterious death." },
    { id: "the-banshees", title: "The Banshees of Inisherin", year: 2022, type: "Movie", genres: ["Drama", "Comedy"], runtime: 114, by: "Martin McDonagh", tone: 145, log: "A lifelong friendship abruptly ends on a remote Irish isle." },
    { id: "portrait-lady-fire", title: "Portrait of a Lady on Fire", year: 2019, type: "Movie", genres: ["Romance", "Drama", "History"], runtime: 122, by: "Céline Sciamma", tone: 22, log: "A painter falls for the bride-to-be she's been hired to portray." },
    { id: "la-la-land", title: "La La Land", year: 2016, type: "Movie", genres: ["Romance", "Drama", "Musical"], runtime: 128, by: "Damien Chazelle", tone: 248, log: "A jazz pianist and an actress chase dreams and each other in L.A." },
    { id: "whiplash", title: "Whiplash", year: 2014, type: "Movie", genres: ["Drama", "Music", "Thriller"], runtime: 106, by: "Damien Chazelle", tone: 40, log: "A young drummer is pushed to the brink by a ruthless instructor." },
    { id: "moonlight", title: "Moonlight", year: 2016, type: "Movie", genres: ["Drama"], runtime: 111, by: "Barry Jenkins", tone: 200, log: "A young man grapples with identity and love across three chapters." },
    { id: "the-northman", title: "The Northman", year: 2022, type: "Movie", genres: ["Action", "Adventure", "Drama"], runtime: 137, by: "Robert Eggers", tone: 12, log: "A Viking prince hunts the uncle who murdered his father." },
    { id: "nosferatu", title: "Nosferatu", year: 2024, type: "Movie", genres: ["Horror", "Drama", "Mystery"], runtime: 132, by: "Robert Eggers", tone: 260, log: "A haunted young woman becomes the obsession of an ancient vampire." },
    { id: "hereditary", title: "Hereditary", year: 2018, type: "Movie", genres: ["Horror", "Drama", "Mystery"], runtime: 127, by: "Ari Aster", tone: 355, log: "A grieving family uncovers terrifying secrets about their ancestry." },
    { id: "sinners", title: "Sinners", year: 2025, type: "Movie", genres: ["Horror", "Thriller", "Drama"], runtime: 137, by: "Ryan Coogler", tone: 5, log: "Twin brothers return home to find an evil waiting to meet them." },

    { id: "severance", title: "Severance", year: 2022, type: "Series", genres: ["Sci-Fi", "Thriller", "Drama"], seasons: 2, by: "Dan Erickson", tone: 195, log: "Office workers surgically divide their work and personal memories." },
    { id: "the-bear", title: "The Bear", year: 2022, type: "Series", genres: ["Drama", "Comedy"], seasons: 3, by: "Christopher Storer", tone: 18, log: "A fine-dining chef returns home to run his family's sandwich shop." },
    { id: "succession", title: "Succession", year: 2018, type: "Series", genres: ["Drama"], seasons: 4, by: "Jesse Armstrong", tone: 210, log: "A media dynasty fractures as its patriarch's health declines." },
    { id: "shogun", title: "Shōgun", year: 2024, type: "Series", genres: ["Drama", "History", "Adventure"], seasons: 1, by: "Justin Marks", tone: 8, log: "A shipwrecked Englishman is drawn into feudal Japan's power struggle." },
    { id: "the-leftovers", title: "The Leftovers", year: 2014, type: "Series", genres: ["Drama", "Mystery", "Sci-Fi"], seasons: 3, by: "Damon Lindelof", tone: 230, log: "A town reckons with the sudden, unexplained loss of 2% of humanity." },
    { id: "chernobyl", title: "Chernobyl", year: 2019, type: "Series", genres: ["Drama", "History", "Thriller"], seasons: 1, by: "Craig Mazin", tone: 100, log: "The harrowing story of the 1986 nuclear disaster and its cover-up." },
    { id: "fleabag", title: "Fleabag", year: 2016, type: "Series", genres: ["Comedy", "Drama"], seasons: 2, by: "Phoebe Waller-Bridge", tone: 350, log: "A sharp, grieving woman careens through love and family in London." },
    { id: "the-rehearsal", title: "The Rehearsal", year: 2022, type: "Series", genres: ["Comedy", "Documentary"], seasons: 2, by: "Nathan Fielder", tone: 280, log: "A filmmaker helps people rehearse life's hardest moments to the extreme." },
    { id: "dark", title: "Dark", year: 2017, type: "Series", genres: ["Sci-Fi", "Thriller", "Mystery"], seasons: 3, by: "Baran bo Odar", tone: 250, log: "A child's disappearance exposes a time-bending secret in a small town." },
    { id: "true-detective", title: "True Detective", year: 2014, type: "Series", genres: ["Thriller", "Drama", "Mystery"], seasons: 4, by: "Nic Pizzolatto", tone: 50, log: "Detectives chase haunting cases that blur the line of obsession." },
    { id: "the-white-lotus", title: "The White Lotus", year: 2021, type: "Series", genres: ["Drama", "Comedy", "Mystery"], seasons: 3, by: "Mike White", tone: 160, log: "Wealthy guests and staff collide at an idyllic, deadly resort." },
    { id: "andor", title: "Andor", year: 2022, type: "Series", genres: ["Sci-Fi", "Drama", "Adventure"], seasons: 2, by: "Tony Gilroy", tone: 205, log: "A reluctant thief is pulled into the rebellion against an empire." },
  ];

  // Curated 'starter ratings' so For You has something to chew on first load
  // (only applied if the user has no saved data yet).
  const SEED_RATINGS = {
    "arrival": 88,
    "the-bear": 79,
    "parasite": 92,
  };

  // Similarity: shared-genre overlap + small same-creator / same-type boost.
  function similar(id, limit) {
    const a = C.find((m) => m.id === id);
    if (!a) return [];
    const scored = C.filter((m) => m.id !== id).map((m) => {
      const shared = m.genres.filter((g) => a.genres.includes(g)).length;
      let s = shared * 10;
      if (m.by === a.by) s += 6;
      if (m.type === a.type) s += 2;
      if (Math.abs(m.year - a.year) <= 3) s += 1;
      return { m, s };
    });
    return scored.filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, limit || 6).map((x) => x.m);
  }

  // Recommendations from a ratings map: weight each catalog item by how it
  // overlaps with the things you rated highly. Excludes already-rated items.
  function recommend(ratings, opts) {
    opts = opts || {};
    const excludeIds = new Set(Object.keys(ratings));
    if (opts.excludeWatchlist) opts.excludeWatchlist.forEach((x) => excludeIds.add(x));
    const liked = Object.entries(ratings).filter(([, r]) => r >= 55);
    if (liked.length === 0) {
      // cold start: just surface acclaimed picks
      return C.filter((m) => !excludeIds.has(m.id)).slice(0, opts.limit || 12).map((m) => ({ m, score: 0, because: null }));
    }
    const out = C.filter((m) => !excludeIds.has(m.id)).map((cand) => {
      let score = 0;
      let bestSrc = null;
      let bestSrcScore = -1;
      liked.forEach(([likedId, r]) => {
        const src = C.find((x) => x.id === likedId);
        if (!src) return;
        const shared = cand.genres.filter((g) => src.genres.includes(g)).length;
        if (shared === 0 && src.by !== cand.by) return;
        let contrib = shared * (r / 100) * 10;
        if (src.by === cand.by) contrib += 5 * (r / 100);
        score += contrib;
        if (contrib > bestSrcScore) { bestSrcScore = contrib; bestSrc = src; }
      });
      return { m: cand, score, because: bestSrc };
    });
    return out.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, opts.limit || 12);
  }

  const ALL_GENRES = Array.from(new Set(C.flatMap((m) => m.genres))).sort();

  window.LUMEN = {
    catalog: C,
    byId: (id) => C.find((m) => m.id === id),
    SEED_RATINGS,
    ALL_GENRES,
    similar,
    recommend,
  };
})();
