import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import WebApp from "@twa-dev/sdk";

import { useUser } from "./hooks/useUser";
import BottomNav from "./components/BottomNav";
import PaywallPage from "./pages/PaywallPage";
import DebtsPage from "./pages/DebtsPage";
import AddPersonPage from "./pages/AddPersonPage";
import EditPersonPage from "./pages/EditPersonPage";
import PersonDetailPage from "./pages/PersonDetailPage";
import AddTransactionPage from "./pages/AddTransactionPage";
import EditTransactionPage from "./pages/EditTransactionPage";
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
        <div className="text-4xl animate-spin">⏳</div>
      </div>
    );
  }

  if (!user || !isAccessible(user.status, user.trial_end, user.paid_until)) {
    return <PaywallPage />;
  }

  return (
    <div style={{ backgroundColor: "var(--tg-theme-bg-color)", minHeight: "100vh" }}>
      <Routes>
        {/* Main tabs */}
        <Route path="/" element={<DebtsPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Person flows */}
        <Route path="/persons/new" element={<AddPersonPage />} />
        <Route path="/persons/:id" element={<PersonDetailPage />} />
        <Route path="/persons/:id/edit" element={<EditPersonPage />} />
        <Route path="/persons/:id/transactions/new" element={<AddTransactionPage />} />

        {/* Transaction edit */}
        <Route path="/transactions/:txnId/edit" element={<EditTransactionPage />} />
      </Routes>

      {/* Only show bottom nav on tab-root pages */}
      <Routes>
        <Route path="/" element={<BottomNav />} />
        <Route path="/archive" element={<BottomNav />} />
        <Route path="/settings" element={<BottomNav />} />
      </Routes>
    </div>
  );
}
