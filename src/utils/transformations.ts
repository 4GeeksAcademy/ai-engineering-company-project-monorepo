import {
  Candidate,
  CandidateReport,
  DISPONIBILIDADES,
  NIVELES_INGLES,
  PAISES_RESIDENCIA,
  SECTORES_INTERES,
  SectorInteres
} from '../types/models'

export function countByCategory<T, K extends string>(
  arr: T[],
  getCategory: (item: T) => K
): Record<K, number> {
  return arr.reduce<Record<K, number>>((acc, item) => {
    const category = getCategory(item)
    acc[category] = (acc[category] ?? 0) + 1
    return acc
  }, {} as Record<K, number>)
}

export function sumField<T>(arr: T[], getValue: (item: T) => number): number {
  return arr.reduce((total, item) => total + getValue(item), 0)
}

export function average<T>(arr: T[], getValue: (item: T) => number): number {
  if (arr.length === 0) {
    return 0
  }
  return sumField(arr, getValue) / arr.length
}

export function findMax<T>(arr: T[], getValue: (item: T) => number): T | null {
  if (arr.length === 0) {
    return null
  }
  return arr.reduce((maxItem, currentItem) => {
    return getValue(currentItem) > getValue(maxItem) ? currentItem : maxItem
  })
}

export function findMin<T>(arr: T[], getValue: (item: T) => number): T | null {
  if (arr.length === 0) {
    return null
  }
  return arr.reduce((minItem, currentItem) => {
    return getValue(currentItem) < getValue(minItem) ? currentItem : minItem
  })
}

function initCounterRecord<K extends string>(keys: readonly K[]): Record<K, number> {
  const record = {} as Record<K, number>
  for (const key of keys) {
    record[key] = 0
  }
  return record
}

export function generateCandidateReport(candidates: Candidate[]): CandidateReport {
  const porSector = {
    ...initCounterRecord(SECTORES_INTERES),
    ...countByCategory(candidates, (candidate) => candidate.sectorInteres)
  }
  const porPais = {
    ...initCounterRecord(PAISES_RESIDENCIA),
    ...countByCategory(candidates, (candidate) => candidate.paisResidencia)
  }
  const porNivelIngles = {
    ...initCounterRecord(NIVELES_INGLES),
    ...countByCategory(candidates, (candidate) => candidate.nivelIngles)
  }
  const porDisponibilidad = {
    ...initCounterRecord(DISPONIBILIDADES),
    ...countByCategory(candidates, (candidate) => candidate.disponibilidad)
  }

  const candidatoMax = findMax(candidates, (candidate) => candidate.aniosExperiencia)
  const candidatoMin = findMin(candidates, (candidate) => candidate.aniosExperiencia)

  return {
    totalCandidatos: candidates.length,
    porSector,
    porPais,
    porNivelIngles,
    porDisponibilidad,
    promedioAniosExperiencia: average(candidates, (candidate) => candidate.aniosExperiencia),
    maxAniosExperiencia: candidatoMax ? candidatoMax.aniosExperiencia : 0,
    minAniosExperiencia: candidatoMin ? candidatoMin.aniosExperiencia : 0
  }
}

export function topCandidatesBySector(
  candidates: Candidate[],
  sector: SectorInteres,
  topN: number
): Candidate[] {
  if (topN <= 0) {
    return []
  }

  return candidates
    .filter((candidate) => candidate.sectorInteres === sector)
    .sort((left, right) => right.aniosExperiencia - left.aniosExperiencia)
    .slice(0, topN)
}