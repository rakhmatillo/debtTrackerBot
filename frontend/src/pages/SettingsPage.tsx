import { useRef, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { api } from "../api";
import { useUser } from "../hooks/useUser";
import { downloadBlob, fileToBase64 } from "../utils/download";
import { formatDate } from "../utils/format";
import BottomSheet from "../components/BottomSheet";

export default function SettingsPage() {
  const { user, loading } = useUser();
  if (loading) return null;
  const fileRef = useRef<HTMLInputElement>(null);

  const [importStep, setImportStep] = useState<"idle" | "preview" | "confirm" | "done">("idle");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    column_mapping: Record<string, string>;
    detected_headers: string[];
    sample_rows: Record<string, string>[];
    total_rows: number;
    errors: string[];
  } | null>(null);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<{ created_persons: number; created_transactions: number; errors: string[] } | null>(null);
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  const now = new Date();
  const trialEnd = user?.trial_end ? new Date(user.trial_end) : null;
  const paidUntil = user?.paid_until ? new Date(user.paid_until) : null;

  const statusLine = (() => {
    if (user?.status === "paid" && paidUntil && paidUntil > now) {
      return { label: `Subscribed until ${formatDate(user.paid_until!)}`, color: "#34d399" };
    }
    if (user?.status === "approved" && trialEnd && trialEnd > now) {
      const days = Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000);
      return { label: `Free trial · ${days} day(s) left`, color: "#fbbf24" };
    }
    return { label: "Access expired", color: "#f87171" };
  })();

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      const res = await api.export.debtsCSV();
      downloadBlob(res.data as Blob, `debts_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      WebApp.showAlert("Export failed.");
    } finally {
      setExportingCSV(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportStep("preview");
    setImportSheetOpen(true);
    try {
      const res = await api.import.preview(file);
      setImportPreview(res.data);
      setImportMapping(res.data.column_mapping);
    } catch {
      WebApp.showAlert("Could not parse this file. Make sure it's a valid CSV.");
      setImportSheetOpen(false);
      setImportStep("idle");
    }
    e.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (!importFile || !importMapping) return;
    setImportStep("confirm");
    try {
      const b64 = await fileToBase64(importFile);
      const res = await api.import.confirm(b64, importMapping);
      setImportResult(res.data);
      setImportStep("done");
    } catch {
      WebApp.showAlert("Import failed.");
      setImportStep("preview");
    }
  };

  const closeImport = () => {
    setImportSheetOpen(false);
    setImportStep("idle");
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
  };

  const REQUIRED_FIELDS = ["person", "type", "amount", "currency", "date"];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--tg-theme-bg-color)", paddingBottom: 80 }}>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold" style={{ color: "var(--tg-theme-text-color)" }}>Settings</h1>
      </div>

      {/* Account */}
      <Section title="Account">
        <Row label="Status" value={statusLine.label} valueColor={statusLine.color} />
        {user?.username && <Row label="Username" value={`@${user.username}`} />}
      </Section>

      {/* Export */}
      <Section title="Export">
        <ActionRow
          label="Export all debts (CSV)"
          description="Download a CSV file of all your debts"
          onClick={handleExportCSV}
          loading={exportingCSV}
        />
      </Section>

      {/* Import */}
      <Section title="Import">
        <ActionRow
          label="Import from CSV"
          description="Upload a CSV with person, type, amount, currency, date columns"
          onClick={() => fileRef.current?.click()}
        />
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
      </Section>

      {/* Import wizard sheet */}
      <BottomSheet open={importSheetOpen} onClose={closeImport} title="Import CSV">
        <div className="px-4 pb-10">
          {importStep === "preview" && !importPreview && (
            <p className="text-center py-8" style={{ color: "var(--tg-theme-hint-color)" }}>Analysing file…</p>
          )}

          {importStep === "preview" && importPreview && (
            <>
              <p className="text-sm mb-3" style={{ color: "var(--tg-theme-hint-color)" }}>
                Found {importPreview.total_rows} rows. Adjust column mapping if needed.
              </p>

              {importPreview.errors.map((e, i) => (
                <div key={i} className="text-xs mb-1 px-2 py-1 rounded" style={{ backgroundColor: "rgba(248,113,113,0.15)", color: "#f87171" }}>
                  ⚠ {e}
                </div>
              ))}

              <div className="mt-3 mb-4 space-y-2">
                {REQUIRED_FIELDS.map((field) => (
                  <div key={field} className="flex items-center gap-2">
                    <span className="text-xs w-20 shrink-0 capitalize" style={{ color: "var(--tg-theme-hint-color)" }}>{field}</span>
                    <select
                      value={importMapping[field] ?? ""}
                      onChange={(e) => setImportMapping((m) => ({ ...m, [field]: e.target.value }))}
                      className="flex-1 rounded-lg px-2 py-1.5 text-xs outline-none"
                      style={{ backgroundColor: "var(--tg-theme-bg-color)", color: "var(--tg-theme-text-color)" }}
                    >
                      <option value="">-- not mapped --</option>
                      {importPreview.detected_headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {importPreview.sample_rows.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--tg-theme-hint-color)" }}>Preview (first row)</p>
                  <div className="rounded-lg p-2 text-xs overflow-x-auto" style={{ backgroundColor: "var(--tg-theme-bg-color)" }}>
                    {Object.entries(importPreview.sample_rows[0]).map(([k, v]) => (
                      <div key={k}><span style={{ color: "var(--tg-theme-hint-color)" }}>{k}:</span> {v}</div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleConfirmImport}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-text-color)" }}
              >
                Import {importPreview.total_rows} rows
              </button>
            </>
          )}

          {importStep === "confirm" && (
            <p className="text-center py-8" style={{ color: "var(--tg-theme-hint-color)" }}>Importing…</p>
          )}

          {importStep === "done" && importResult && (
            <>
              <div className="py-6 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold" style={{ color: "var(--tg-theme-text-color)" }}>Import complete</p>
                <p className="text-sm mt-1" style={{ color: "var(--tg-theme-hint-color)" }}>
                  {importResult.created_persons} people · {importResult.created_transactions} transactions
                </p>
              </div>
              {importResult.errors.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold mb-1" style={{ color: "#fbbf24" }}>Warnings ({importResult.errors.length})</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.errors.map((e, i) => (
                      <p key={i} className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>• {e}</p>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={closeImport}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-text-color)" }}
              >
                Done
              </button>
            </>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

// ── Small helper components ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-3 mb-4">
      <p className="text-xs uppercase tracking-wide px-1 mb-1" style={{ color: "var(--tg-theme-hint-color)" }}>{title}</p>
      <div style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)", borderRadius: 14 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(128,128,128,0.1)" }}>
      <span className="text-sm" style={{ color: "var(--tg-theme-text-color)" }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: valueColor ?? "var(--tg-theme-hint-color)" }}>{value}</span>
    </div>
  );
}

function ActionRow({ label, description, onClick, loading }: {
  label: string;
  description: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full text-left px-4 py-3 active:opacity-70 transition-opacity"
      style={{ borderBottom: "1px solid rgba(128,128,128,0.1)", opacity: loading ? 0.6 : 1 }}
    >
      <div className="text-sm font-medium" style={{ color: "var(--tg-theme-button-color)" }}>
        {loading ? "Processing…" : label}
      </div>
      <div className="text-xs mt-0.5" style={{ color: "var(--tg-theme-hint-color)" }}>{description}</div>
    </button>
  );
}
