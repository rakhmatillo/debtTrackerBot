import { useEffect, useState } from "react";
import { api } from "../api";
import type { User } from "../types";

// Module-level cache so SettingsPage and App share the same user without re-fetching
let _user: User | null = null;
let _listeners: Array<(u: User | null) => void> = [];

function setGlobal(u: User | null) {
  _user = u;
  _listeners.forEach((fn) => fn(u));
}

export function useUser() {
  const [user, setUser] = useState<User | null>(_user);
  const [loading, setLoading] = useState(_user === null);

  useEffect(() => {
    _listeners.push(setUser);
    return () => { _listeners = _listeners.filter((fn) => fn !== setUser); };
  }, []);

  useEffect(() => {
    if (_user !== null) return;
    api.auth
      .register()
      .then((res) => setGlobal(res.data))
      .catch(() => setGlobal(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
