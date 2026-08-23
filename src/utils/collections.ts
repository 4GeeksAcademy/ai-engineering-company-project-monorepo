import { Candidate, Disponibilidad, SECTORES_INTERES, SectorInteres } from '../types/models'

export type SortOrder = 'asc' | 'desc'

export interface SortCriterion<T> {
  key: keyof T
  order: SortOrder
}

export function filterBy<T>(arr: T[], predicate: (item: T) => boolean): T[] {
  return arr.filter(predicate)
}

export function filterCandidatesBySector(
  candidates: Candidate[],
  sector: SectorInteres
): Candidate[] {
  return filterBy(candidates, (candidate) => candidate.sectorInteres === sector)
}

export function filterCandidatesByExperience(
  candidates: Candidate[],
  min: number,
  max: number
): Candidate[] {
  return filterBy(
    candidates,
    (candidate) => candidate.aniosExperiencia >= min && candidate.aniosExperiencia <= max
  )
}

export function filterCandidatesByDisponibilidad(
  candidates: Candidate[],
  disp: Disponibilidad
): Candidate[] {
  return filterBy(candidates, (candidate) => candidate.disponibilidad === disp)
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) {
    return 0
  }
  if (a == null) {
    return -1
  }
  if (b == null) {
    return 1
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime()
  }
  return String(a).localeCompare(String(b), 'es')
}

export function sortBy<T>(arr: T[], key: keyof T, order: SortOrder): T[] {
  const multiplier = order === 'asc' ? 1 : -1
  return [...arr].sort((left, right) => {
    return compareValues(left[key], right[key]) * multiplier
  })
}

export function sortByMultiple<T>(arr: T[], criteria: SortCriterion<T>[]): T[] {
  if (criteria.length === 0) {
    return [...arr]
  }

  return [...arr].sort((left, right) => {
    for (const criterion of criteria) {
      const multiplier = criterion.order === 'asc' ? 1 : -1
      const comparison = compareValues(left[criterion.key], right[criterion.key]) * multiplier
      if (comparison !== 0) {
        return comparison
      }
    }
    return 0
  })
}

export function groupBy<T, K extends string>(arr: T[], getKey: (item: T) => K): Record<K, T[]> {
  return arr.reduce<Record<K, T[]>>((acc, item) => {
    const key = getKey(item)
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(item)
    return acc
  }, {} as Record<K, T[]>)
}

export function groupCandidatesBySector(candidates: Candidate[]): Record<SectorInteres, Candidate[]> {
  const grouped = groupBy(candidates, (candidate) => candidate.sectorInteres)
  const result = {} as Record<SectorInteres, Candidate[]>

  for (const sector of SECTORES_INTERES) {
    result[sector] = grouped[sector] ?? []
  }

  return result
}