import WebApp from "@twa-dev/sdk";

export default function PaywallPage() {
  const handlePay = () => {
    WebApp.showAlert(
      "Send a message to the bot to get payment details and continue your subscription."
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-xl font-bold mb-2" style={{ color: "var(--tg-theme-text-color)" }}>
        Trial Ended
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--tg-theme-hint-color)" }}>
        Your 7-day free trial has expired. Subscribe to continue tracking your
        debts.
      </p>
      <button
        onClick={handlePay}
        className="w-full max-w-xs py-3 rounded-xl font-semibold text-white"
        style={{ backgroundColor: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-text-color)" }}
      >
        Pay to Continue
      </button>
    </div>
  );
}
