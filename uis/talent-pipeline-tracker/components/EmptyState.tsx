export default function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      <p className="text-lg font-semibold text-stone-800">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-stone-600">{description}</p>
      )}
    </div>
  );
}
