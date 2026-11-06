import React from 'react';
import SelectFilter, { FilterOption } from './SelectFilter';

interface StatusFilterProps {
  value: string;
  onChange: (value: string) => void;
  options?: FilterOption[];
}

const DEFAULT_STATUS_OPTIONS: FilterOption[] = [
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
}) => (
  <SelectFilter id="status-filter" label="Estado" value={value} onChange={onChange} options={options} />
);

export default StatusFilter;
