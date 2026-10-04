import type { ReactNode } from "react";

type BreakdownValue = {
  count: number;
  percentage: number;
};

export function MetricCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function BreakdownList({
  items,
}: {
  items: Record<string, BreakdownValue>;
}) {
  return (
    <ul className="dataList">
      {Object.entries(items).map(([label, data]) => (
        <li key={label}>
          <span>{label}</span>
          <strong>
            {data.count} ({data.percentage.toFixed(1)}%)
          </strong>
        </li>
      ))}
    </ul>
  );
}