import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import WebApp from "@twa-dev/sdk";
import { api } from "../api";
import type { Person } from "../types";
import { formatAmount, netIsPositive } from "../utils/format";
import { useBackButton } from "../hooks/useTelegramButton";

export default function ArchivePage() {
  const navigate = useNavigate();
  useBackButton("/");

  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.persons.list(true).then((r) => setPersons(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRestore = async (person: Person) => {
    WebApp.showConfirm(`Restore ${person.name}?`, async (ok) => {
      if (!ok) return;
      await api.persons.archive(person.id);
      load();
    });
  };

  const handleDelete = (person: Person) => {
    WebApp.showConfirm(
      `Permanently delete ${person.name} and all their transactions? This cannot be undone.`,
      async (ok) => {
        if (!ok) return;
        await api.persons.delete(person.id);
        load();
      }
    );
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--tg-theme-bg-color)", paddingBottom: 80 }}>
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold" style={{ color: "var(--tg-theme-text-color)" }}>Archive</h1>
        <p className="text-xs mt-1" style={{ color: "var(--tg-theme-hint-color)" }}>
          Archived people are hidden from the main list.
        </p>
      </div>

      <div style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)", borderRadius: 16, margin: "0 12px" }}>
        {loading ? (
          <p className="text-center py-10 text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>Loading…</p>
        ) : persons.length === 0 ? (
          <p className="text-center py-10 text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
            No archived people.
          </p>
        ) : (
          persons.map((person) => (
            <div
              key={person.id}
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid rgba(128,128,128,0.15)" }}
            >
              <div>
                <div className="font-medium text-sm" style={{ color: "var(--tg-theme-text-color)" }}>
                  {person.name}
                </div>
                {person.balances.map((b) => (
                  <div
                    key={b.currency}
                    className="text-xs"
                    style={{ color: netIsPositive(String(b.net)) ? "#34d399" : "#f87171" }}
                  >
                    {netIsPositive(String(b.net)) ? "+" : "-"}{formatAmount(String(b.net))} {b.currency}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestore(person)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ backgroundColor: "rgba(52,211,153,0.15)", color: "#34d399" }}
                >
                  Restore
                </button>
                <button
                  onClick={() => handleDelete(person)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ backgroundColor: "rgba(248,113,113,0.15)", color: "#f87171" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
