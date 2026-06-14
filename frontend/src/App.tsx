import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import WebApp from "@twa-dev/sdk";

import { useUser } from "./hooks/useUser";
import BottomNav from "./components/BottomNav";
import PaywallPage from "./pages/PaywallPage";
import DebtsPage from "./pages/DebtsPage";
import ArchivePage from "./pages/ArchivePage";
import SettingsPage from "./pages/SettingsPage";

function isAccessible(status: string, trial_end: string | null, paid_until: string | null): boolean {
  const now = new Date();
  if (status === "paid" && paid_until && new Date(paid_until) > now) return true;
  if (status === "approved" && trial_end && new Date(trial_end) > now) return true;
  return false;
}

export default function App() {
  const { user, loading } = useUser();

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  if (!user || !isAccessible(user.status, user.trial_end, user.paid_until)) {
    return <PaywallPage />;
  }

  return (
    <div className="pb-16" style={{ backgroundColor: "var(--tg-theme-bg-color)", minHeight: "100vh" }}>
      <Routes>
        <Route path="/" element={<DebtsPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
