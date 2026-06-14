import { useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function AmountInput({ value, onChange, placeholder = "0", autoFocus }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    // Allow only one dot
    const parts = raw.split(".");
    const cleaned = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
    onChange(cleaned);
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full text-4xl font-bold text-center bg-transparent outline-none py-4"
      style={{ color: "var(--tg-theme-text-color)" }}
    />
  );
}
