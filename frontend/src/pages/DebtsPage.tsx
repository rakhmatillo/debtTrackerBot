import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import PersonCard from "../components/PersonCard";
import SummarySheet from "../components/SummarySheet";
import type { Person } from "../types";

export default function DebtsPage() {
  const navigate = useNavigate();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const load = () => {
    setLoading(true);
    api.persons
      .list(false)
      .then((r) => setPersons(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = persons.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const visible = showAll
    ? filtered
    : filtered.filter((p) => p.balances.length > 0);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--tg-theme-bg-color)" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--tg-theme-text-color)" }}>Debts</h1>
        <button
          onClick={() => setSummaryOpen(true)}
          className="text-sm px-3 py-1.5 rounded-xl font-medium"
          style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)", color: "var(--tg-theme-button-color)" }}
        >
          Summary
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people…"
          className="w-full rounded-xl px-3 py-2 text-sm outline-none"
          style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)", color: "var(--tg-theme-text-color)" }}
        />
      </div>

      {/* Active / All toggle */}
      <div className="px-4 pb-3 flex gap-2">
        {(["Active", "All"] as const).map((label) => {
          const isActive = label === "Active" ? !showAll : showAll;
          return (
            <button
              key={label}
              onClick={() => setShowAll(label === "All")}
              className="text-xs px-3 py-1 rounded-full font-medium transition-colors"
              style={{
                backgroundColor: isActive ? "var(--tg-theme-button-color)" : "var(--tg-theme-secondary-bg-color)",
                color: isActive ? "var(--tg-theme-button-text-color)" : "var(--tg-theme-hint-color)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)", borderRadius: 16, margin: "0 12px" }}>
        {loading ? (
          <p className="text-center py-12 text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-center py-12 text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
            {search ? "No results." : "No debts yet. Tap + to add someone."}
          </p>
        ) : (
          visible.map((p) => <PersonCard key={p.id} person={p} />)
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate("/persons/new")}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full text-2xl font-bold shadow-lg flex items-center justify-center"
        style={{ backgroundColor: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-text-color)" }}
      >
        +
      </button>

      <SummarySheet open={summaryOpen} onClose={() => setSummaryOpen(false)} />
    </div>
  );
}
