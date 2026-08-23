import { Candidate, NivelIngles } from '../types/models'

type PrimitiveComparable = string | number

export function linearSearch<T>(arr: T[], predicate: (item: T) => boolean): T | null {
  for (const item of arr) {
    if (predicate(item)) {
      return item
    }
  }
  return null
}

export function linearSearchAll<T>(arr: T[], predicate: (item: T) => boolean): T[] {
  const matches: T[] = []
  for (const item of arr) {
    if (predicate(item)) {
      matches.push(item)
    }
  }
  return matches
}

/**
 * Realiza búsqueda binaria sobre un arreglo ya ordenado por la clave indicada.
 * Precondición: `arr` debe estar previamente ordenado por `key` en orden ascendente.
 */
export function binarySearch<T>(arr: T[], key: keyof T, target: PrimitiveComparable): number {
  let left = 0
  let right = arr.length - 1

  while (left <= right) {
    const middle = Math.floor((left + right) / 2)
    const value = arr[middle][key]

    if (typeof value !== 'string' && typeof value !== 'number') {
      return -1
    }

    if (value === target) {
      return middle
    }

    if (value < target) {
      left = middle + 1
    } else {
      right = middle - 1
    }
  }

  return -1
}

export function findCandidateByEmail(candidates: Candidate[], email: string): Candidate | null {
  return linearSearch(candidates, (candidate) => candidate.email === email)
}

export function findCandidateById(candidates: Candidate[], id: string): Candidate | null {
  return linearSearch(candidates, (candidate) => candidate.id === id)
}

export function findCandidatesByNivelIngles(
  candidates: Candidate[],
  nivel: NivelIngles
): Candidate[] {
  return linearSearchAll(candidates, (candidate) => candidate.nivelIngles === nivel)
}

export function binarySearchByExperience(candidates: Candidate[], experience: number): number {
  return binarySearch(candidates, 'aniosExperiencia', experience)
}