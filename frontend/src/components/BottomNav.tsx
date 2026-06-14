import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "Debts", icon: "💰" },
  { to: "/archive", label: "Archive", icon: "🗃️" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex border-t"
      style={{
        backgroundColor: "var(--tg-theme-secondary-bg-color)",
        borderColor: "var(--tg-theme-hint-color)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === "/"}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-2 text-xs gap-1 transition-opacity ${
              isActive ? "opacity-100" : "opacity-40"
            }`
          }
          style={{ color: "var(--tg-theme-text-color)" }}
        >
          <span className="text-xl">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
