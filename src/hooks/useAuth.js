import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    // If Firebase isn't configured, fall through to auth page after 3s
    const fallback = setTimeout(() => setUser(null), 3000);
    const unsub = onAuthStateChanged(auth, (u) => {
      clearTimeout(fallback);
      setUser(u ?? null);
    });
    return () => { clearTimeout(fallback); unsub(); };
  }, []);

  return user;
}
