import type { Lead, PaisOperacion, TipoProducto } from '../types/models';

const categoriasProducto: TipoProducto[] = [
  'Moda',
  'Electrónica',
  'Cosmética',
  'Alimentación',
  'Otro',
];

const paisesOperacion: PaisOperacion[] = ['Estados Unidos', 'España', 'Ambos', 'Otro'];

export function contarLeadsPorCategoria(leads: Lead[]): Record<TipoProducto, number> {
  const conteoBase: Record<TipoProducto, number> = {
    Moda: 0,
    Electrónica: 0,
    Cosmética: 0,
    Alimentación: 0,
    Otro: 0,
  };

  const conteoInicial = categoriasProducto.reduce<Record<TipoProducto, number>>((acumulado, categoria) => {
    acumulado[categoria] = 0;
    return acumulado;
  }, { ...conteoBase });

  return leads.reduce<Record<TipoProducto, number>>((acumulado, lead) => {
    acumulado[lead.tipoProducto] = (acumulado[lead.tipoProducto] ?? 0) + 1;
    return acumulado;
  }, conteoInicial);
}

export function contarLeadsPorPaisOperacion(leads: Lead[]): Record<PaisOperacion, number> {
  const conteoBase: Record<PaisOperacion, number> = {
    'Estados Unidos': 0,
    España: 0,
    Ambos: 0,
    Otro: 0,
  };

  const conteoInicial = paisesOperacion.reduce<Record<PaisOperacion, number>>((acumulado, pais) => {
    acumulado[pais] = 0;
    return acumulado;
  }, { ...conteoBase });

  return leads.reduce<Record<PaisOperacion, number>>((acumulado, lead) => {
    acumulado[lead.paisOperacion] += 1;
    return acumulado;
  }, conteoInicial);
}

export function calcularPorcentaje3PLActivo(leads: Lead[]): number {
  if (leads.length === 0) {
    return 0;
  }

  const totalCon3PLActivo = leads.reduce<number>((acumulado, lead) => {
    return lead.trabajaCon3PL === 'Sí' ? acumulado + 1 : acumulado;
  }, 0);

  return (totalCon3PLActivo / leads.length) * 100;
}

export function obtenerMaximosYMinimos(leads: Lead[]): { maxServicios: number; minServicios: number } {
  if (leads.length === 0) {
    return { maxServicios: 0, minServicios: 0 };
  }

  return leads.reduce<{ maxServicios: number; minServicios: number }>(
    (acumulado, lead) => {
      const cantidadServicios = lead.serviciosInteres.length;

      return {
        maxServicios: Math.max(acumulado.maxServicios, cantidadServicios),
        minServicios: Math.min(acumulado.minServicios, cantidadServicios),
      };
    },
    { maxServicios: 0, minServicios: Number.POSITIVE_INFINITY }
  );
}
