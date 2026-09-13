import React from 'react';

interface StatusFilterProps {
  value: string;
  onChange: (value: string) => void;
  options?: { value: string; label: string }[];
}

const DEFAULT_STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: 'Activo' },
  { value: 'on_hold', label: 'En Espera' },
  { value: 'hired', label: 'Contratado' },
  { value: 'rejected', label: 'Descartado' },
];

export const StatusFilter: React.FC<StatusFilterProps> = ({
  value,
  onChange,
  options = DEFAULT_STATUS_OPTIONS,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 min-w-[180px]">
      <label
        htmlFor="status-filter"
        className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
      >
        Estado
      </label>
      <select
        id="status-filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StatusFilter;
