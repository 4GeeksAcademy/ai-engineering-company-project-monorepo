"use client";

export default function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search by name or email..."
      className="w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
    />
  );
}
