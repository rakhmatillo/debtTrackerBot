import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import WebApp from "@twa-dev/sdk";
import { api } from "../api";
import AmountInput from "../components/AmountInput";
import type { Transaction } from "../types";
import { toInputDate } from "../utils/format";
import { useBackButton, useMainButton } from "../hooks/useTelegramButton";

export default function EditTransactionPage() {
  const { txnId } = useParams<{ txnId: string }>();
  const [params] = useSearchParams();
  const personId = params.get("person");
  const navigate = useNavigate();
  useBackButton(`/persons/${personId}`);

  const [txn, setTxn] = useState<Transaction | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch person to find the transaction
    if (!personId) return;
    api.persons.get(Number(personId)).then((r) => {
      const found = findTxn(r.data.transactions, Number(txnId));
      if (found) {
        setTxn(found);
        setAmount(String(found.amount));
        setNote(found.note ?? "");
        setDate(toInputDate(found.date));
      }
    });
  }, [txnId, personId]);

  const handleSave = useCallback(async () => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) { WebApp.showAlert("Enter a valid amount."); return; }
    setSaving(true);
    try {
      await api.transactions.update(Number(txnId), {
        amount: num,
        note: note.trim() || undefined,
        date: new Date(date).toISOString(),
      });
      navigate(`/persons/${personId}`, { replace: true });
    } catch {
      WebApp.showAlert("Failed to save.");
    } finally {
      setSaving(false);
    }
  }, [amount, note, date, txnId, personId, navigate]);

  useMainButton(saving ? "Saving…" : "Save Changes", handleSave, !saving);

  if (!txn) {
    return <div className="flex items-center justify-center min-h-screen" style={{ color: "var(--tg-theme-hint-color)" }}>Loading…</div>;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--tg-theme-bg-color)", paddingBottom: 100 }}>
      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold mb-4" style={{ color: "var(--tg-theme-text-color)" }}>Edit Transaction</h1>

        <div className="rounded-2xl mb-4" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)" }}>
          <AmountInput value={amount} onChange={setAmount} />
          <p className="text-center text-xs pb-2" style={{ color: "var(--tg-theme-hint-color)" }}>
            {txn.currency} · {txn.type === "lend" ? "Lent" : "Borrowed"}
          </p>
        </div>

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

        <div>
          <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: "var(--tg-theme-hint-color)" }}>Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
            style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)", color: "var(--tg-theme-text-color)" }}
          />
        </div>
      </div>
    </div>
  );
}

function findTxn(txns: Transaction[], id: number): Transaction | undefined {
  for (const t of txns) {
    if (t.id === id) return t;
    const found = findTxn(t.children, id);
    if (found) return found;
  }
}
