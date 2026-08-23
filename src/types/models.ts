export const PAISES_RESIDENCIA = ['España', 'Estados Unidos', 'Otro'] as const
export const SECTORES_INTERES = [
  'Tecnología',
  'Retail',
  'Servicios Financieros',
  'Consultoría',
  'Otro'
] as const
export const NIVELES_INGLES = ['Básico', 'Intermedio', 'Avanzado', 'Nativo'] as const
export const DISPONIBILIDADES = [
  'Inmediata',
  '1 mes',
  '2-3 meses',
  'Solo explorando'
] as const
export const LINEAS_SERVICIO = [
  'Headhunting Ejecutivo',
  'Outsourcing de Atención al Cliente',
  'Formación Corporativa'
] as const
export const SECTORES_CLIENTE = [
  'Tecnología',
  'Retail',
  'Servicios Financieros'
] as const

export type PaisResidencia = (typeof PAISES_RESIDENCIA)[number]
export type SectorInteres = (typeof SECTORES_INTERES)[number]
export type NivelIngles = (typeof NIVELES_INGLES)[number]
export type Disponibilidad = (typeof DISPONIBILIDADES)[number]
export type LineaServicio = (typeof LINEAS_SERVICIO)[number]
export type SectorCliente = (typeof SECTORES_CLIENTE)[number]

export interface Candidate {
  id: string
  nombreCompleto: string
  email: string
  telefono: string
  paisResidencia: PaisResidencia
  aniosExperiencia: number
  sectorInteres: SectorInteres
  nivelIngles: NivelIngles
  disponibilidad: Disponibilidad
  linkedin?: string
  comentarios?: string
  aceptaPolitica: boolean
  fechaRegistro: Date
}

export interface Service {
  id: string
  nombre: LineaServicio
  descripcion: string
  caracteristicas: string[]
  sectoresObjetivo: SectorCliente[]
  activo: boolean
}

export interface Employee {
  id: string
  nombreCompleto: string
  email: string
  departamento: string
  cargo: string
  oficina: 'Valencia' | 'Miami'
  aniosEnEmpresa: number
  activo: boolean
}

export interface CandidateReport {
  totalCandidatos: number
  porSector: Record<SectorInteres, number>
  porPais: Record<PaisResidencia, number>
  porNivelIngles: Record<NivelIngles, number>
  porDisponibilidad: Record<Disponibilidad, number>
  promedioAniosExperiencia: number
  maxAniosExperiencia: number
  minAniosExperiencia: number
}