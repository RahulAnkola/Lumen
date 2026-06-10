import { useState, useEffect, useCallback } from "react";
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export function useUserData(uid) {
  const [ratings, setRatings] = useState({});
  const [watchlist, setWatchlist] = useState({});
  const [dismissed, setDismissed] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setRatings({}); setWatchlist({}); setDismissed({}); setLoading(false); return; }
    setLoading(true);
    const unsub1 = onSnapshot(collection(db, "users", uid, "ratings"), (snap) => {
      const map = {};
      snap.forEach((d) => { map[d.id] = d.data(); });
      setRatings(map);
      setLoading(false);
    });
    const unsub2 = onSnapshot(collection(db, "users", uid, "watchlist"), (snap) => {
      const map = {};
      snap.forEach((d) => { map[d.id] = d.data(); });
      setWatchlist(map);
    });
    const unsub3 = onSnapshot(collection(db, "users", uid, "dismissed"), (snap) => {
      const map = {};
      snap.forEach((d) => { map[d.id] = d.data(); });
      setDismissed(map);
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [uid]);

  const saveRating = useCallback(async (item, value) => {
    if (!uid) return;
    const key = `${item.mediaType}_${item.tmdbId}`;
    await setDoc(doc(db, "users", uid, "ratings", key), {
      value,
      tmdbId: item.tmdbId,
      mediaType: item.mediaType,
      title: item.title,
      year: item.year,
      overview: item.overview,
      posterPath: item.posterPath,
      genres: item.genres,
      runtime: item.runtime || 0,
      seasons: item.seasons || 0,
      originalLanguage: item.originalLanguage || null,
      ratedAt: serverTimestamp(),
    });
    // graduate from watchlist when rated
    await deleteDoc(doc(db, "users", uid, "watchlist", key)).catch(() => {});
  }, [uid]);

  const toggleWatchlist = useCallback(async (item) => {
    if (!uid) return;
    const key = `${item.mediaType}_${item.tmdbId}`;
    const isOn = !!watchlist[key];
    if (isOn) {
      await deleteDoc(doc(db, "users", uid, "watchlist", key));
    } else {
      await setDoc(doc(db, "users", uid, "watchlist", key), {
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        year: item.year,
        overview: item.overview,
        posterPath: item.posterPath,
        genres: item.genres,
        runtime: item.runtime || 0,
        seasons: item.seasons || 0,
        addedAt: serverTimestamp(),
      });
    }
  }, [uid, watchlist]);

  const dismissItem = useCallback(async (item) => {
    if (!uid) return;
    const key = `${item.mediaType}_${item.tmdbId}`;
    await setDoc(doc(db, "users", uid, "dismissed", key), {
      tmdbId: item.tmdbId,
      mediaType: item.mediaType,
      title: item.title,
      originalLanguage: item.originalLanguage || null,
      dismissedAt: serverTimestamp(),
    });
  }, [uid]);

  return { ratings, watchlist, dismissed, loading, saveRating, toggleWatchlist, dismissItem };
}
