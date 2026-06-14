import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import WebApp from "@twa-dev/sdk";
import { api } from "../api";
import AmountInput from "../components/AmountInput";
import type { Person } from "../types";
import { todayISO } from "../utils/format";
import { useBackButton, useMainButton } from "../hooks/useTelegramButton";

export default function AddTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const typeParam = (params.get("type") ?? "lend") as "lend" | "borrow";
  const parentId = params.get("parent") ? Number(params.get("parent")) : undefined;
  const maxAmount = params.get("max") ? parseFloat(params.get("max")!) : undefined;
  const forcedCurrency = params.get("currency") ?? undefined;
  const isPartial = !!parentId;

  useBackButton(`/persons/${id}`);

  const [person, setPerson] = useState<Person | null>(null);
  const [txnType, setTxnType] = useState<"lend" | "borrow">(typeParam);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(forcedCurrency ?? "");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.persons.get(Number(id)).then((r) => {
      setPerson(r.data);
      if (!currency && r.data.currencies.length > 0) {
        setCurrency(r.data.currencies[0]);
      }
    });
  }, [id]);

  const handleSave = useCallback(async () => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) { WebApp.showAlert("Enter a valid amount."); return; }
    if (!currency) { WebApp.showAlert("Select a currency."); return; }
    if (maxAmount !== undefined && num > maxAmount) {
      WebApp.showAlert(`Maximum partial payment is ${maxAmount} ${currency}.`);
      return;
    }

    setSaving(true);
    try {
      await api.transactions.create(Number(id), {
        type: isPartial ? typeParam : txnType,
        amount: num,
        currency,
        note: note.trim() || undefined,
        date: new Date(date).toISOString(),
        parent_id: parentId,
      });
      navigate(`/persons/${id}`, { replace: true });
    } catch (e: any) {
      WebApp.showAlert(e?.response?.data?.detail ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  }, [amount, currency, note, date, txnType, parentId, id, navigate, isPartial, typeParam, maxAmount]);

  const label = isPartial ? "Record Payment" : txnType === "lend" ? "Add Lend" : "Add Borrow";
  useMainButton(saving ? "Saving…" : label, handleSave, !saving);

  if (!person) {
    return <div className="flex items-center justify-center min-h-screen" style={{ color: "var(--tg-theme-hint-color)" }}>Loading…</div>;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--tg-theme-bg-color)", paddingBottom: 100 }}>
      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold mb-1" style={{ color: "var(--tg-theme-text-color)" }}>
          {isPartial ? "Partial Payment" : txnType === "lend" ? "Lend Money" : "Borrow Money"}
        </h1>
        <p className="text-sm mb-4" style={{ color: "var(--tg-theme-hint-color)" }}>
          {isPartial ? `Recording payment for ${person.name}` : `With ${person.name}`}
        </p>

        {/* Type toggle — only for new (not partial) */}
        {!isPartial && (
          <div
            className="flex rounded-xl p-1 mb-5"
            style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)" }}
          >
            {(["lend", "borrow"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTxnType(t)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: txnType === t ? (t === "lend" ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)") : "transparent",
                  color: txnType === t ? (t === "lend" ? "#34d399" : "#f87171") : "var(--tg-theme-hint-color)",
                }}
              >
                {t === "lend" ? "I Lent" : "I Borrowed"}
              </button>
            ))}
          </div>
        )}

        {/* Amount */}
        <div
          className="rounded-2xl mb-4"
          style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)" }}
        >
          <AmountInput value={amount} onChange={setAmount} autoFocus />
          {maxAmount !== undefined && (
            <p className="text-center text-xs pb-2" style={{ color: "var(--tg-theme-hint-color)" }}>
              Max: {maxAmount} {currency}
            </p>
          )}
        </div>

        {/* Currency selector */}
        {!forcedCurrency && person.currencies.length > 1 && (
          <div className="mb-4">
            <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: "var(--tg-theme-hint-color)" }}>Currency</label>
            <div className="flex gap-2">
              {person.currencies.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{
                    backgroundColor: currency === c ? "var(--tg-theme-button-color)" : "var(--tg-theme-secondary-bg-color)",
                    color: currency === c ? "var(--tg-theme-button-text-color)" : "var(--tg-theme-text-color)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date */}
        <div className="mb-4">
          <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: "var(--tg-theme-hint-color)" }}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)", color: "var(--tg-theme-text-color)" }}
          />
        </div>

        {/* Note */}
        <div>
          <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: "var(--tg-theme-hint-color)" }}>Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's this for?"
            rows={2}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
            style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)", color: "var(--tg-theme-text-color)" }}
          />
        </div>
      </div>
    </div>
  );
}
