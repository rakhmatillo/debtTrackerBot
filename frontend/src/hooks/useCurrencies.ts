import { useEffect, useState } from "react";
import { api } from "../api";
import type { Currency } from "../types";

let _cache: Currency[] | null = null;

export function useCurrencies() {
  const [currencies, setCurrencies] = useState<Currency[]>(_cache ?? []);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) return;
    api.currencies.list().then((res) => {
      _cache = res.data;
      setCurrencies(res.data);
      setLoading(false);
    });
  }, []);

  return { currencies, loading };
}
