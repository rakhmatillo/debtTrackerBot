import type { Transaction } from "../types";
import { formatAmount, formatDate } from "../utils/format";

interface Props {
  transaction: Transaction;
  onEdit: (txn: Transaction) => void;
  onDelete: (txn: Transaction) => void;
  onAddPartial: (txn: Transaction) => void;
}

export default function TransactionItem({ transaction, onEdit, onDelete, onAddPartial }: Props) {
  const isLend = transaction.type === "lend";
  const paidTotal = transaction.children.reduce((s, c) => s + parseFloat(c.amount), 0);
  const remaining = parseFloat(transaction.amount) - paidTotal;
  const isSettled = remaining <= 0;

  return (
    <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(128,128,128,0.12)" }}>
      {/* Main transaction row */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: isLend ? "#34d399" : "#f87171", marginTop: 6 }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: isLend ? "#34d399" : "#f87171" }}>
                {isLend ? "Lent" : "Borrowed"}
              </span>
              <span className="text-sm font-bold" style={{ color: "var(--tg-theme-text-color)" }}>
                {formatAmount(transaction.amount)} {transaction.currency}
              </span>
              {isSettled && (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(52,211,153,0.15)", color: "#34d399" }}>
                  Settled
                </span>
              )}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--tg-theme-hint-color)" }}>
              {formatDate(transaction.date)}
            </div>
            {transaction.note && (
              <div className="text-xs mt-0.5 italic" style={{ color: "var(--tg-theme-hint-color)" }}>
                {transaction.note}
              </div>
            )}
            {transaction.children.length > 0 && (
              <div className="text-xs mt-1" style={{ color: "var(--tg-theme-hint-color)" }}>
                Paid: {formatAmount(String(paidTotal))} · Remaining: {formatAmount(String(remaining))} {transaction.currency}
              </div>
            )}
          </div>
        </div>

        {/* Action menu */}
        <ActionMenu
          onEdit={() => onEdit(transaction)}
          onDelete={() => onDelete(transaction)}
          onPartial={isSettled ? undefined : () => onAddPartial(transaction)}
        />
      </div>

      {/* Child payments */}
      {transaction.children.map((child) => (
        <div key={child.id} className="mt-2 ml-5 flex items-start gap-2">
          <span className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>↳</span>
          <div>
            <span className="text-xs font-medium" style={{ color: "var(--tg-theme-hint-color)" }}>
              Partial payment: {formatAmount(child.amount)} {child.currency}
            </span>
            <span className="text-xs ml-2" style={{ color: "var(--tg-theme-hint-color)" }}>
              {formatDate(child.date)}
            </span>
            {child.note && (
              <div className="text-xs italic" style={{ color: "var(--tg-theme-hint-color)", opacity: 0.7 }}>
                {child.note}
              </div>
            )}
          </div>
          <button
            onClick={() => onDelete(child)}
            className="ml-auto text-xs"
            style={{ color: "var(--tg-theme-hint-color)" }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function ActionMenu({ onEdit, onDelete, onPartial }: {
  onEdit: () => void;
  onDelete: () => void;
  onPartial?: () => void;
}) {
  return (
    <div className="flex items-center gap-1 ml-2 shrink-0">
      {onPartial && (
        <button
          onClick={onPartial}
          className="text-xs px-2 py-1 rounded-lg"
          style={{ backgroundColor: "var(--tg-theme-bg-color)", color: "var(--tg-theme-button-color)" }}
          title="Add partial payment"
        >
          +Pay
        </button>
      )}
      <button
        onClick={onEdit}
        className="text-xs px-2 py-1 rounded-lg"
        style={{ backgroundColor: "var(--tg-theme-bg-color)", color: "var(--tg-theme-hint-color)" }}
      >
        Edit
      </button>
      <button
        onClick={onDelete}
        className="text-xs px-2 py-1 rounded-lg"
        style={{ backgroundColor: "var(--tg-theme-bg-color)", color: "#f87171" }}
      >
        Del
      </button>
    </div>
  );
}
