import React from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

interface SelectFilterProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
}

/** Labelled <select> used by the list filters (status, stage). */
export const SelectFilter: React.FC<SelectFilterProps> = ({ id, label, value, onChange, options }) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 min-w-[180px]">
      <label
        htmlFor={id}
        className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
      >
        {label}
      </label>
      <select
        id={id}
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

export default SelectFilter;
