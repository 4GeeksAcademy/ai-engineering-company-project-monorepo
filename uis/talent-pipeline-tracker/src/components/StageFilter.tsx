import React from 'react';

interface StageFilterProps {
  value: string;
  onChange: (value: string) => void;
  options?: { value: string; label: string }[];
}

const DEFAULT_STAGE_OPTIONS = [
  { value: '', label: 'Todas las etapas' },
  { value: 'applied', label: 'Aplicado' },
  { value: 'screening', label: 'Filtro Inicial' },
  { value: 'interview', label: 'Entrevista' },
  { value: 'technical_test', label: 'Prueba Técnica' },
  { value: 'offer', label: 'Oferta' },
  { value: 'hired', label: 'Contratado' },
  { value: 'rejected', label: 'Descartado' },
];

export const StageFilter: React.FC<StageFilterProps> = ({
  value,
  onChange,
  options = DEFAULT_STAGE_OPTIONS,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 min-w-[180px]">
      <label
        htmlFor="stage-filter"
        className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
      >
        Etapa
      </label>
      <select
        id="stage-filter"
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

export default StageFilter;
