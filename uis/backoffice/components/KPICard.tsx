interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  trend?: number;
  icon: string;
}

export default function KPICard({ title, value, subtitle, trend, icon }: KPICardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={`text-sm font-semibold ${
              trend >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">vs last 7 days</span>
        </div>
      )}
    </div>
  );
}
