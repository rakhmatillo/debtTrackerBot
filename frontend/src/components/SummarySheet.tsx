import { useEffect, useState } from "react";
import { api } from "../api";
import type { Summary } from "../types";
import { formatAmount } from "../utils/format";
import BottomSheet from "./BottomSheet";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SummarySheet({ open, onClose }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (!open) return;
    api.summary.get().then((r) => setSummary(r.data));
  }, [open]);

  const owedCurrencies = Object.keys(summary?.owed_to_you ?? {});
  const oweCurrencies = Object.keys(summary?.you_owe ?? {});
  const isEmpty = owedCurrencies.length === 0 && oweCurrencies.length === 0;

  return (
    <BottomSheet open={open} onClose={onClose} title="Debt Summary">
      <div className="px-4 pb-10">
        {!summary ? (
          <p className="text-center py-8" style={{ color: "var(--tg-theme-hint-color)" }}>Loading…</p>
        ) : isEmpty ? (
          <p className="text-center py-8" style={{ color: "var(--tg-theme-hint-color)" }}>All settled up! 🎉</p>
        ) : (
          <>
            {owedCurrencies.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tg-theme-hint-color)" }}>
                  They owe you
                </div>
                {owedCurrencies.map((cur) => (
                  <div key={cur} className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid rgba(128,128,128,0.12)" }}>
                    <span className="text-sm" style={{ color: "var(--tg-theme-text-color)" }}>{cur}</span>
                    <span className="text-base font-bold" style={{ color: "#34d399" }}>
                      +{formatAmount(summary!.owed_to_you[cur])}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {oweCurrencies.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tg-theme-hint-color)" }}>
                  You owe
                </div>
                {oweCurrencies.map((cur) => (
                  <div key={cur} className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid rgba(128,128,128,0.12)" }}>
                    <span className="text-sm" style={{ color: "var(--tg-theme-text-color)" }}>{cur}</span>
                    <span className="text-base font-bold" style={{ color: "#f87171" }}>
                      -{formatAmount(summary!.you_owe[cur])}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
