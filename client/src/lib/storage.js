import { useCallback, useEffect, useState } from "react";

const NAME_KEY = "pullup_username";
const TOKEN_KEY = "pullup_session";

/**
 * Sitzung = Nickname + Token. Beides liegt im localStorage; entscheidend ist
 * nur der Token – der Server leitet daraus den Namen ab, sodass man sich nicht
 * unter fremden Namen eintragen kann.
 */
export function useSession() {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userName = localStorage.getItem(NAME_KEY);
    return token && userName ? { token, userName } : null;
  });

  const signIn = useCallback((userName, token) => {
    localStorage.setItem(NAME_KEY, userName);
    localStorage.setItem(TOKEN_KEY, token);
    setSession({ token, userName });
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setSession(null);
  }, []);

  return [session, signIn, signOut];
}

/** Token für den X-Session-Header. */
export function sessionToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

const ONCE_KEY = "pullup_once";

/** Zeigt ein Popup genau einmal pro Key (z.B. neue Saison, neue Version). */
export function useOncePopup(key) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const storeKey = `${ONCE_KEY}:${key}`;
    const seen = JSON.parse(localStorage.getItem(storeKey) || "null");
    localStorage.setItem(storeKey, JSON.stringify(key));
    if (seen !== key) setOpen(true);
  }, [key]);

  return [open, () => setOpen(false)];
}

const DAILY_KEY = "daily_challenge_done";

/** Tages-Challenge bleibt erledigt markiert, auch nach einem Reload. */
export function useDailyDone(kind, autoDone) {
  const key = `${DAILY_KEY}_${kind}_${new Date().toISOString().slice(0, 10)}`;
  const [done, setDone] = useState(() => localStorage.getItem(key) === "1");

  useEffect(() => {
    if (autoDone && !done) {
      setDone(true);
      localStorage.setItem(key, "1");
    }
  }, [autoDone, done, key]);

  const markDone = useCallback(() => {
    setDone(true);
    localStorage.setItem(key, "1");
  }, [key]);

  return [done, markDone];
}
