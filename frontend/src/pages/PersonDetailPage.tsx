import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import WebApp from "@twa-dev/sdk";
import { api } from "../api";
import BottomSheet from "../components/BottomSheet";
import TransactionItem from "../components/TransactionItem";
import type { Person, Transaction } from "../types";
import { formatAmount, netIsPositive } from "../utils/format";
import { downloadBlob } from "../utils/download";
import { useBackButton } from "../hooks/useTelegramButton";

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useBackButton("/");

  const [person, setPerson] = useState<Person | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderValue, setReminderValue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.persons.get(Number(id)).then((r) => setPerson(r.data));

  useEffect(() => { load(); }, [id]);

  const handleDelete = (txn: Transaction) => {
    WebApp.showConfirm(`Delete this ${txn.type === "lend" ? "lent" : "borrowed"} record?`, async (ok) => {
      if (!ok) return;
      await api.transactions.delete(txn.id);
      load();
    });
  };

  const handleArchive = () => {
    if (!person) return;
    WebApp.showConfirm(
      person.is_archived ? "Restore this person?" : "Archive this person?",
      async (ok) => {
        if (!ok) return;
        await api.persons.archive(Number(id));
        navigate("/");
      }
    );
  };

  const handleDeletePerson = () => {
    WebApp.showConfirm("Permanently delete this person and all their transactions?", async (ok) => {
      if (!ok) return;
      await api.persons.delete(Number(id));
      navigate("/");
    });
  };

  const handleExportPDF = async () => {
    try {
      const res = await api.export.personPDF(Number(id));
      downloadBlob(res.data as Blob, `debt_report_${person?.name}.pdf`);
    } catch {
      WebApp.showAlert("Failed to generate PDF.");
    }
  };

  const handleSetReminder = async () => {
    if (!reminderValue) return;
    setSaving(true);
    await api.persons.setReminder(Number(id), new Date(reminderValue).toISOString());
    setSaving(false);
    setReminderOpen(false);
    load();
  };

  const handleCancelReminder = async () => {
    await api.persons.cancelReminder(Number(id));
    setReminderOpen(false);
    load();
  };

  if (!person) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p style={{ color: "var(--tg-theme-hint-color)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--tg-theme-bg-color)", paddingBottom: 80 }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--tg-theme-text-color)" }}>{person.name}</h1>
          {/* Balance chips */}
          <div className="flex gap-2 mt-1 flex-wrap">
            {person.balances.length === 0 ? (
              <span className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>Settled</span>
            ) : (
              person.balances.map((b) => {
                const pos = netIsPositive(String(b.net));
                return (
                  <div
                    key={b.currency}
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      backgroundColor: pos ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
                      color: pos ? "#34d399" : "#f87171",
                    }}
                  >
                    {pos ? "+" : "-"}{formatAmount(String(b.net))} {b.currency}
                  </div>
                );
              })
            )}
          </div>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          className="text-xl p-1"
          style={{ color: "var(--tg-theme-hint-color)" }}
        >
          ⋯
        </button>
      </div>

      {/* Add transaction buttons */}
      <div className="px-4 pb-4 flex gap-3">
        <button
          onClick={() => navigate(`/persons/${id}/transactions/new?type=lend`)}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: "rgba(52,211,153,0.15)", color: "#34d399" }}
        >
          + Lend
        </button>
        <button
          onClick={() => navigate(`/persons/${id}/transactions/new?type=borrow`)}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: "rgba(248,113,113,0.15)", color: "#f87171" }}
        >
          + Borrow
        </button>
      </div>

      {/* Transactions */}
      <div style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)", borderRadius: 16, margin: "0 12px" }}>
        {person.transactions.length === 0 ? (
          <p className="text-center py-10 text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
            No transactions yet.
          </p>
        ) : (
          person.transactions.map((txn) => (
            <TransactionItem
              key={txn.id}
              transaction={txn}
              onEdit={(t) => navigate(`/transactions/${t.id}/edit?person=${id}`)}
              onDelete={handleDelete}
              onAddPartial={(t) =>
                navigate(`/persons/${id}/transactions/new?type=${t.type}&parent=${t.id}&max=${
                  parseFloat(t.amount) - t.children.reduce((s, c) => s + parseFloat(c.amount), 0)
                }&currency=${t.currency}`)
              }
            />
          ))
        )}
      </div>

      {/* Options menu bottom sheet */}
      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title={person.name}>
        <div className="pb-8">
          {[
            { label: "✏️  Edit Person", action: () => { setMenuOpen(false); navigate(`/persons/${id}/edit`); } },
            { label: "🔔  Set Reminder", action: () => { setMenuOpen(false); setReminderOpen(true); } },
            { label: "📄  Export PDF", action: () => { setMenuOpen(false); handleExportPDF(); } },
            {
              label: person.is_archived ? "📤  Restore" : "📦  Archive",
              action: () => { setMenuOpen(false); handleArchive(); },
            },
            { label: "🗑️  Delete Person", action: () => { setMenuOpen(false); handleDeletePerson(); }, danger: true },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full text-left px-5 py-3.5 text-sm"
              style={{
                color: item.danger ? "#f87171" : "var(--tg-theme-text-color)",
                borderBottom: "1px solid rgba(128,128,128,0.12)",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Reminder bottom sheet */}
      <BottomSheet open={reminderOpen} onClose={() => setReminderOpen(false)} title="Set Reminder">
        <div className="px-4 pb-10 space-y-4">
          <input
            type="datetime-local"
            value={reminderValue}
            onChange={(e) => setReminderValue(e.target.value)}
            className="w-full rounded-xl px-3 py-3 text-sm outline-none"
            style={{ backgroundColor: "var(--tg-theme-bg-color)", color: "var(--tg-theme-text-color)" }}
          />
          {person.reminder_at && (
            <button
              onClick={handleCancelReminder}
              className="w-full py-3 rounded-xl text-sm font-medium"
              style={{ backgroundColor: "rgba(248,113,113,0.15)", color: "#f87171" }}
            >
              Cancel Current Reminder
            </button>
          )}
          <button
            onClick={handleSetReminder}
            disabled={!reminderValue || saving}
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{
              backgroundColor: reminderValue ? "var(--tg-theme-button-color)" : "var(--tg-theme-secondary-bg-color)",
              color: reminderValue ? "var(--tg-theme-button-text-color)" : "var(--tg-theme-hint-color)",
            }}
          >
            {saving ? "Saving…" : "Set Reminder"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
