import type { Lead } from '../types/models';

export function buscarLeadLineal(leads: Lead[], email: string): Lead | null {
  for (const lead of leads) {
    if (lead.emailCorporativo === email) {
      return lead;
    }
  }

  return null;
}

export function buscarLeadBinario(leadsOrdenados: Lead[], nombreEmpresa: string): number {
  let izquierda = 0;
  let derecha = leadsOrdenados.length - 1;

  while (izquierda <= derecha) {
    const medio = Math.floor((izquierda + derecha) / 2);
    const nombreActual = leadsOrdenados[medio].nombreEmpresa;

    if (nombreActual === nombreEmpresa) {
      return medio;
    }

    if (nombreActual < nombreEmpresa) {
      izquierda = medio + 1;
    } else {
      derecha = medio - 1;
    }
  }

  return -1;
}
