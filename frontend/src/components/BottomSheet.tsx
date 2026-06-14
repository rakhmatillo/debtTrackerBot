import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function BottomSheet({ open, onClose, title, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      />
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}
        style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)", maxHeight: "85vh", overflowY: "auto" }}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--tg-theme-hint-color)", opacity: 0.4 }} />
        </div>
        {title && (
          <div className="flex items-center justify-between px-4 pt-2 pb-3">
            <span className="font-semibold text-base" style={{ color: "var(--tg-theme-text-color)" }}>{title}</span>
            <button onClick={onClose} className="text-xl leading-none" style={{ color: "var(--tg-theme-hint-color)" }}>✕</button>
          </div>
        )}
        {children}
      </div>
    </>
  );
}
