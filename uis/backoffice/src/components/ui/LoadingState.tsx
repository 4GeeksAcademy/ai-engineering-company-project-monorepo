import { Loader2 } from "lucide-react";

/**
 * "Cargando…" placeholder shared by the data views (spinner + text).
 *
 * `reserveSpace` is for the place where a table or list will appear: the box keeps roughly the height of a loaded
 * viewport, so when the data arrives the content grows *inside* space that was already reserved instead of pushing
 * the rest of the page (Cumulative Layout Shift). Leave it off for small, inline loaders.
 */
export default function LoadingState({
  label = "Cargando…",
  reserveSpace = false,
  className = "",
}: {
  label?: string;
  reserveSpace?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex gap-3 text-slate-300 ${reserveSpace ? "min-h-[80vh] items-start" : "items-center"} ${className}`}>
      <Loader2 className="animate-spin" size={20} />
      {label}
    </div>
  );
}
