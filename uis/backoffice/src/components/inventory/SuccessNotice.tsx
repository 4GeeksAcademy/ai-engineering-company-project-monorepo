import { CheckCircle2 } from "lucide-react";

/** The confirmation after an order was registered (role="status": read out without taking the focus). */
export default function SuccessNotice({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
    >
      <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
      {message}
    </div>
  );
}
