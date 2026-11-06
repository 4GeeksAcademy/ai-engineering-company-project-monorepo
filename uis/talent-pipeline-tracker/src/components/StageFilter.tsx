import React from 'react';
import SelectFilter, { FilterOption } from './SelectFilter';

interface StageFilterProps {
  value: string;
  onChange: (value: string) => void;
  options?: FilterOption[];
}

const DEFAULT_STAGE_OPTIONS: FilterOption[] = [
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
}) => (
  <SelectFilter id="stage-filter" label="Etapa" value={value} onChange={onChange} options={options} />
);

export default StageFilter;
