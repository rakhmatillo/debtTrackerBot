import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import WebApp from "@twa-dev/sdk";

import { useUser, retryUser } from "./hooks/useUser";
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

type AccessState = "ok" | "paywall" | "pending" | "revoked";

function getAccessState(
  status: string,
  trial_end: string | null,
  paid_until: string | null,
): AccessState {
  if (status === "rejected" || status === "suspended") return "revoked";
  if (status === "pending") return "pending";
  const now = new Date();
  if (status === "paid" && paid_until && new Date(paid_until) > now) return "ok";
  if (status === "approved" && trial_end && new Date(trial_end) > now) return "ok";
  return "paywall";
}

export default function App() {
  const { user, loading, loadError } = useUser();

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

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--tg-theme-text-color)" }}>
          Connection Error
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--tg-theme-hint-color)" }}>
          Could not connect to the server.
        </p>
        <button
          onClick={retryUser}
          className="px-6 py-2 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-text-color)" }}
        >
          Try again
        </button>
      </div>
    );
  }

  const access: AccessState = user
    ? getAccessState(user.status, user.trial_end, user.paid_until)
    : "paywall";

  if (access === "revoked") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--tg-theme-text-color)" }}>
          Access Revoked
        </h1>
        <p className="text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
          Your access has been revoked. Contact the admin for help.
        </p>
      </div>
    );
  }

  if (access === "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--tg-theme-text-color)" }}>
          Waiting for Approval
        </h1>
        <p className="text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
          Your access request has been sent to the admin. You will receive a
          notification once you are approved.
        </p>
      </div>
    );
  }

  if (access === "paywall") {
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
