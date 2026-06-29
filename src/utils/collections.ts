import type { Lead } from '../types/models';

export type LeadCriterios = Partial<Lead>;

export type DireccionOrden = 'asc' | 'desc';

export function filtrarLeads(leads: Lead[], criterios: LeadCriterios): Lead[] {
  const criteriosActivos = Object.entries(criterios).filter(([, valor]) => valor !== undefined) as Array<
    [keyof Lead, Lead[keyof Lead]]
  >;

  if (criteriosActivos.length === 0) {
    return [...leads];
  }

  return leads.filter((lead) => {
    return criteriosActivos.every(([campo, valor]) => {
      if (campo === 'serviciosInteres') {
        const serviciosRequeridos = valor as Lead['serviciosInteres'];

        // Un lead coincide si contiene todos los servicios solicitados en el criterio.
        return serviciosRequeridos.every((servicio) => lead.serviciosInteres.includes(servicio));
      }

      return lead[campo] === valor;
    });
  });
}

export function ordenarLeadsPorNombreEmpresa(
  leads: Lead[],
  direccion: DireccionOrden = 'asc'
): Lead[] {
  return [...leads].sort((leadA, leadB) => {
    const comparacion = leadA.nombreEmpresa.localeCompare(leadB.nombreEmpresa, 'es', {
      sensitivity: 'base',
    });

    return direccion === 'asc' ? comparacion : -comparacion;
  });
}
