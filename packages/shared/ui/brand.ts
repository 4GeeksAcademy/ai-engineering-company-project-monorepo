/**
 * Brand constants for shared UI components
 */

export const CATEGORY_LABELS: Record<string, string> = {
  CUSTOMER_COMPLAINT: 'Queja de cliente',
  EQUIPMENT: 'Falla de equipamiento',
  SUPPLY: 'Problema de abastecimiento',
  FOOD_QUALITY: 'Calidad de alimentos',
  STAFF: 'Incidente de personal',
};

export const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  resolved: 'Resuelto',
  discarded: 'Descartado',
};

export const BRANCH_LABELS: Record<string, string> = {
  'COL-01': 'Brasaland Medellín Centro',
  'COL-02': 'Brasaland El Poblado',
  'COL-03': 'Brasaland Laureles',
  'COL-04': 'Brasaland Envigado',
  'COL-05': 'Brasaland Bucaramanga',
  'COL-06': 'Brasaland Bogotá Norte',
  'COL-07': 'Brasaland Bogotá Chapinero',
  'COL-08': 'Brasaland Cali Granada',
  'COL-09': 'Brasaland Barranquilla',
  'COL-10': 'Brasaland Cartagena',
  'FLA-01': 'Brasaland Brickell',
  'FLA-02': 'Brasaland Wynwood',
  'FLA-03': 'Brasaland Doral',
  'FLA-04': 'Brasaland Orlando',
  'HQ-MDE': 'Sede Central Medellín',
};

export const ORIGIN_LABELS: Record<string, string> = {
  api: 'API',
  csv_import: 'Importación CSV',
  manual: 'Manual',
};
