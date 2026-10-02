interface RevenueByCountryProps {
  revenue: Record<string, number>;
}

export default function RevenueByCountry({ revenue }: RevenueByCountryProps) {
  const total = revenue["Colombia"] + revenue["United States"];
  const colombiaPercent = total > 0 ? (revenue["Colombia"] / total) * 100 : 0;
  const usPercent = total > 0 ? (revenue["United States"] / total) * 100 : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">Revenue by Country</h3>
      <p className="mb-6 text-sm text-gray-500">30-day breakdown</p>

      {/* Donut-style visual */}
      <div className="mb-6 flex justify-center">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 36 36" className="h-full w-full">
            <circle
              cx="18"
              cy="18"
              r="15.91549430918954"
              fill="transparent"
              stroke="#3b82f6"
              strokeWidth="3.5"
              strokeDasharray={`${usPercent} ${100 - usPercent}`}
              strokeDashoffset="25"
            />
            <circle
              cx="18"
              cy="18"
              r="15.91549430918954"
              fill="transparent"
              stroke="#c83e2c"
              strokeWidth="3.5"
              strokeDasharray={`${colombiaPercent} ${100 - colombiaPercent}`}
              strokeDashoffset={25 - usPercent}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900">
              ${(total / 1000).toFixed(0)}k
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-brasa-red" />
            <span className="text-sm font-medium text-gray-700">Colombia</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-gray-900">
              ${revenue["Colombia"].toLocaleString()}
            </span>
            <span className="ml-2 text-xs text-gray-400">
              {colombiaPercent.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-sm font-medium text-gray-700">United States</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-gray-900">
              ${revenue["United States"].toLocaleString()}
            </span>
            <span className="ml-2 text-xs text-gray-400">
              {usPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
