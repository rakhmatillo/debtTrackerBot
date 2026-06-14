import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import WebApp from "@twa-dev/sdk";
import { api } from "../api";
import CurrencyPicker from "../components/CurrencyPicker";
import { useBackButton, useMainButton } from "../hooks/useTelegramButton";

export default function EditPersonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useBackButton(`/persons/${id}`);

  const [name, setName] = useState("");
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.persons.get(Number(id)).then((r) => {
      setName(r.data.name);
      setCurrencies(r.data.currencies);
    });
  }, [id]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) { WebApp.showAlert("Please enter a name."); return; }
    if (currencies.length === 0) { WebApp.showAlert("Select at least one currency."); return; }
    setSaving(true);
    try {
      await api.persons.update(Number(id), { name: name.trim(), currencies });
      navigate(`/persons/${id}`, { replace: true });
    } catch {
      WebApp.showAlert("Failed to save.");
    } finally {
      setSaving(false);
    }
  }, [name, currencies, id, navigate]);

  useMainButton(saving ? "Saving…" : "Save Changes", handleSave, !saving && name.trim().length > 0);

  const toggleCurrency = (code: string) => {
    setCurrencies((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
    setPickerOpen(false);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--tg-theme-bg-color)", paddingBottom: 80 }}>
      <div className="px-4 pt-4">
        <h1 className="text-xl font-bold mb-4" style={{ color: "var(--tg-theme-text-color)" }}>Edit Person</h1>

        <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: "var(--tg-theme-hint-color)" }}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-base outline-none mb-5"
          style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)", color: "var(--tg-theme-text-color)" }}
        />

        <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: "var(--tg-theme-hint-color)" }}>
          Currencies (up to 3)
        </label>
        <div className="flex gap-2 flex-wrap mb-3">
          {currencies.map((c) => (
            <div
              key={c}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ backgroundColor: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-text-color)" }}
            >
              {c}
              <button
                onClick={() => setCurrencies((prev) => prev.filter((x) => x !== c))}
                className="ml-1 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
          {currencies.length < 3 && (
            <button
              onClick={() => setPickerOpen(true)}
              className="px-3 py-1.5 rounded-full text-sm border"
              style={{ borderColor: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-color)" }}
            >
              + Add
            </button>
          )}
        </div>
      </div>

      <CurrencyPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={currencies}
        onSelect={toggleCurrency}
        maxSelections={3}
      />
    </div>
  );
}
