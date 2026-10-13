import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { STOCK_LEVEL_LABELS, stockLevel, type StockLevel } from "../../lib/inventoryRules";

const STYLES: Record<StockLevel, { badge: string; icon: typeof XCircle }> = {
  empty: { badge: "border-rose-500/40 bg-rose-500/10 text-rose-300", icon: XCircle },
  low: { badge: "border-amber-500/40 bg-amber-500/10 text-amber-300", icon: AlertTriangle },
  ok: { badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", icon: CheckCircle2 },
};

/** The stock level as colour *and* text + icon, so it still reads without colour (colour-blind users, print). */
export default function StockBadge({ stock }: { stock: number }) {
  const level = stockLevel(stock);
  const { badge, icon: Icon } = STYLES[level];
  return (
    <span
      data-level={level}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge}`}
    >
      <Icon size={13} aria-hidden="true" />
      {STOCK_LEVEL_LABELS[level]}
    </span>
  );
}
