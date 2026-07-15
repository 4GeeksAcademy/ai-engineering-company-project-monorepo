export default function Spinner({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600"
        role="status"
        aria-label={label}
      />
      <p className="text-sm text-stone-600">{label}</p>
    </div>
  );
}
