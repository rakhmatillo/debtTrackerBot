import { useState } from "react";
import { useCurrencies } from "../hooks/useCurrencies";
import BottomSheet from "./BottomSheet";

interface Props {
  open: boolean;
  onClose: () => void;
  selected: string[];
  onSelect: (code: string) => void;
  maxSelections?: number;
}

export default function CurrencyPicker({ open, onClose, selected, onSelect, maxSelections = 3 }: Props) {
  const { currencies } = useCurrencies();
  const [search, setSearch] = useState("");

  const filtered = currencies.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <BottomSheet open={open} onClose={() => { setSearch(""); onClose(); }} title="Select Currency">
      <div className="px-4 pb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search currencies…"
          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
          style={{
            backgroundColor: "var(--tg-theme-bg-color)",
            color: "var(--tg-theme-text-color)",
          }}
          autoFocus
        />
      </div>
      <div className="pb-8">
        {filtered.map((c) => {
          const isSelected = selected.includes(c.code);
          const atMax = !isSelected && selected.length >= maxSelections;
          return (
            <button
              key={c.code}
              onClick={() => {
                if (atMax) return;
                onSelect(c.code);
                setSearch("");
              }}
              disabled={atMax}
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-opacity"
              style={{
                opacity: atMax ? 0.35 : 1,
                borderBottom: "1px solid var(--tg-theme-hint-color)",
              }}
            >
              <div>
                <span className="font-semibold text-sm" style={{ color: "var(--tg-theme-text-color)" }}>
                  {c.code}
                </span>
                <span className="text-xs ml-2" style={{ color: "var(--tg-theme-hint-color)" }}>
                  {c.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>{c.symbol}</span>
                {isSelected && <span style={{ color: "var(--tg-theme-button-color)" }}>✓</span>}
              </div>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
