"use client";

import { DailySales } from "../lib/data";

interface SalesChartProps {
  sales: DailySales[];
}

export default function SalesChart({ sales }: SalesChartProps) {
  // Aggregate by date
  const dailyRevenue: Record<string, number> = {};
  for (const sale of sales) {
    if (!dailyRevenue[sale.date]) dailyRevenue[sale.date] = 0;
    dailyRevenue[sale.date] += sale.revenue;
  }

  const dates = Object.keys(dailyRevenue).sort();
  const revenues = dates.map((d) => dailyRevenue[d]);
  const maxRevenue = Math.max(...revenues);

  // Show last 14 days
  const displayDates = dates.slice(-14);
  const displayRevenues = displayDates.map((d) => dailyRevenue[d]);
  const displayMax = Math.max(...displayRevenues);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
          <p className="text-sm text-gray-500">Last 14 days, all locations</p>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-brasa-red" />
            Colombia
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
            United States
          </span>
        </div>
      </div>

      {/* Simple bar chart */}
      <div className="flex h-48 items-end gap-2">
        {displayDates.map((date, i) => {
          const height = (displayRevenues[i] / displayMax) * 100;
          const dayLabel = new Date(date).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
          });
          return (
            <div key={date} className="group relative flex flex-1 flex-col items-center">
              <div className="mb-2 hidden rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                ${displayRevenues[i].toLocaleString()}
              </div>
              <div
                className="w-full rounded-t bg-brasa-red transition-all hover:bg-brasa-red-dark"
                style={{ height: `${height}%` }}
              />
              <span className="mt-2 text-[10px] text-gray-400">{dayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
