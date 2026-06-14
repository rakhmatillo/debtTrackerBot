import { useNavigate } from "react-router-dom";
import type { Person } from "../types";
import { formatAmount, netIsPositive } from "../utils/format";

interface Props {
  person: Person;
}

export default function PersonCard({ person }: Props) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/persons/${person.id}`)}
      className="w-full flex items-center justify-between px-4 py-3 text-left active:opacity-70 transition-opacity"
      style={{ borderBottom: "1px solid rgba(128,128,128,0.15)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
          style={{
            backgroundColor: "var(--tg-theme-button-color)",
            color: "var(--tg-theme-button-text-color)",
          }}
        >
          {person.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-medium text-sm" style={{ color: "var(--tg-theme-text-color)" }}>
            {person.name}
          </div>
          {person.reminder_at && (
            <div className="text-xs mt-0.5" style={{ color: "var(--tg-theme-button-color)" }}>
              🔔 Reminder set
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-0.5 ml-2">
        {person.balances.length === 0 ? (
          <span className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>Settled</span>
        ) : (
          person.balances.map((b) => {
            const positive = netIsPositive(String(b.net));
            return (
              <div key={b.currency} className="text-sm font-semibold" style={{ color: positive ? "#34d399" : "#f87171" }}>
                {positive ? "+" : "-"}{formatAmount(String(b.net))} {b.currency}
              </div>
            );
          })
        )}
      </div>
    </button>
  );
}
