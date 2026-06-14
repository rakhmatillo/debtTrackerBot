export default function PendingPage() {
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
