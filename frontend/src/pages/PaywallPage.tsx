import WebApp from "@twa-dev/sdk";

export default function PaywallPage() {
  const handlePay = () => {
    // Close the Mini App — user lands back in the bot chat where they can
    // get payment details and send their receipt.
    WebApp.close();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-xl font-bold mb-2" style={{ color: "var(--tg-theme-text-color)" }}>
        Trial Ended
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--tg-theme-hint-color)" }}>
        Your 7-day free trial has expired. To continue, pay and send your
        receipt to the bot — the admin will activate your account manually.
      </p>
      <button
        onClick={handlePay}
        className="w-full max-w-xs py-3 rounded-xl font-semibold"
        style={{
          backgroundColor: "var(--tg-theme-button-color)",
          color: "var(--tg-theme-button-text-color)",
        }}
      >
        Go to Bot → Pay &amp; Send Receipt
      </button>
    </div>
  );
}
