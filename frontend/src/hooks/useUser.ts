import { useEffect, useState } from "react";
import { api } from "../api";
import type { User } from "../types";

// Module-level cache so SettingsPage and App share the same user without re-fetching
let _user: User | null = null;
let _loadError = false;
let _listeners: Array<(u: User | null) => void> = [];
let _errorListeners: Array<(e: boolean) => void> = [];
let _loadingListeners: Array<(b: boolean) => void> = [];

function setGlobal(u: User | null, err = false) {
  _user = u;
  _loadError = err;
  _listeners.forEach((fn) => fn(u));
  _errorListeners.forEach((fn) => fn(err));
  // Any pending fetch has resolved — tell all subscribers they're done loading.
  _loadingListeners.forEach((fn) => fn(false));
}

export function retryUser(): void {
  _loadError = false;
  _user = null;
  _errorListeners.forEach((fn) => fn(false));
  _loadingListeners.forEach((fn) => fn(true));
  api.auth
    .register()
    .then((res) => setGlobal(res.data, false))
    .catch(() => setGlobal(null, true));
}

export function useUser() {
  const [user, setUser] = useState<User | null>(_user);
  const [loading, setLoading] = useState(_user === null && !_loadError);
  const [loadError, setLoadError] = useState(_loadError);

  useEffect(() => {
    _listeners.push(setUser);
    _errorListeners.push(setLoadError);
    _loadingListeners.push(setLoading);
    return () => {
      _listeners = _listeners.filter((fn) => fn !== setUser);
      _errorListeners = _errorListeners.filter((fn) => fn !== setLoadError);
      _loadingListeners = _loadingListeners.filter((fn) => fn !== setLoading);
    };
  }, []);

  useEffect(() => {
    if (_user !== null || _loadError) return;
    let cancelled = false;
    api.auth
      .register()
      .then((res) => { if (!cancelled) setGlobal(res.data, false); })
      .catch(() => { if (!cancelled) setGlobal(null, true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { user, loading, loadError };
}
