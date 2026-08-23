import {
  Candidate,
  DISPONIBILIDADES,
  NIVELES_INGLES,
  PAISES_RESIDENCIA,
  SECTORES_INTERES
} from '../types/models'

export interface ValidationError {
  campo: string
  mensaje: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

const MESSAGES = {
  nombreCompleto: 'El nombre debe contener al menos nombre y apellido',
  email: 'Ingresa un email válido (ejemplo: nombre@empresa.com)',
  telefono: 'El teléfono debe incluir código de país (ejemplo: +34 612 345 678)',
  paisResidencia: 'Selecciona tu país de residencia',
  aniosExperiencia: 'Los años de experiencia deben estar entre 0 y 50',
  sectorInteres: 'Selecciona el sector de tu interés',
  nivelIngles: 'Indica tu nivel de inglés',
  disponibilidad: 'Selecciona tu disponibilidad',
  linkedin: 'Si incluyes LinkedIn, debe ser una URL válida',
  comentarios: 'Los comentarios no pueden exceder 500 caracteres',
  aceptaPolitica: 'Debes aceptar la política de tratamiento de datos para continuar'
} as const

function validationResult(errors: ValidationError[]): ValidationResult {
  return {
    isValid: errors.length === 0,
    errors
  }
}

function isEmptyString(value: string | undefined): boolean {
  return value == null || value.trim().length === 0
}

function buildSingleFieldError(campo: string, mensaje: string): ValidationError {
  return { campo, mensaje }
}

export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const errors = emailRegex.test(email)
    ? []
    : [buildSingleFieldError('email', MESSAGES.email)]

  return validationResult(errors)
}

export function validateTelefono(telefono: string): ValidationResult {
  const errors = telefono.trim().startsWith('+')
    ? []
    : [buildSingleFieldError('telefono', MESSAGES.telefono)]

  return validationResult(errors)
}

export function validateLinkedin(linkedin?: string): ValidationResult {
  if (linkedin == null || linkedin.trim().length === 0) {
    return validationResult([])
  }

  const linkedinValido = linkedin.startsWith('http://') || linkedin.startsWith('https://')
  const errors = linkedinValido ? [] : [buildSingleFieldError('linkedin', MESSAGES.linkedin)]

  return validationResult(errors)
}

export function validateComentarios(comentarios?: string): ValidationResult {
  if (comentarios == null) {
    return validationResult([])
  }

  const errors = comentarios.length <= 500
    ? []
    : [buildSingleFieldError('comentarios', MESSAGES.comentarios)]

  return validationResult(errors)
}

export function validateAniosExperiencia(aniosExperiencia: number): ValidationResult {
  const experienciaValida =
    Number.isFinite(aniosExperiencia) && aniosExperiencia >= 0 && aniosExperiencia <= 50

  const errors = experienciaValida
    ? []
    : [buildSingleFieldError('aniosExperiencia', MESSAGES.aniosExperiencia)]

  return validationResult(errors)
}

export function validateNombreCompleto(nombreCompleto: string): ValidationResult {
  const palabras = nombreCompleto
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)

  const errors = palabras.length >= 2
    ? []
    : [buildSingleFieldError('nombreCompleto', MESSAGES.nombreCompleto)]

  return validationResult(errors)
}

export function hasRequiredFields(candidate: Partial<Candidate>): ValidationResult {
  const errors: ValidationError[] = []

  if (isEmptyString(candidate.nombreCompleto)) {
    errors.push(buildSingleFieldError('nombreCompleto', MESSAGES.nombreCompleto))
  }
  if (isEmptyString(candidate.email)) {
    errors.push(buildSingleFieldError('email', MESSAGES.email))
  }
  if (isEmptyString(candidate.telefono)) {
    errors.push(buildSingleFieldError('telefono', MESSAGES.telefono))
  }
  if (candidate.paisResidencia == null) {
    errors.push(buildSingleFieldError('paisResidencia', MESSAGES.paisResidencia))
  }
  if (candidate.aniosExperiencia == null) {
    errors.push(buildSingleFieldError('aniosExperiencia', MESSAGES.aniosExperiencia))
  }
  if (candidate.sectorInteres == null) {
    errors.push(buildSingleFieldError('sectorInteres', MESSAGES.sectorInteres))
  }
  if (candidate.nivelIngles == null) {
    errors.push(buildSingleFieldError('nivelIngles', MESSAGES.nivelIngles))
  }
  if (candidate.disponibilidad == null) {
    errors.push(buildSingleFieldError('disponibilidad', MESSAGES.disponibilidad))
  }
  if (candidate.aceptaPolitica !== true) {
    errors.push(buildSingleFieldError('aceptaPolitica', MESSAGES.aceptaPolitica))
  }

  return validationResult(errors)
}

export function validateCandidate(candidate: Partial<Candidate>): ValidationResult {
  const errors: ValidationError[] = []
  errors.push(...hasRequiredFields(candidate).errors)

  if (candidate.nombreCompleto != null && candidate.nombreCompleto.trim().length > 0) {
    errors.push(...validateNombreCompleto(candidate.nombreCompleto).errors)
  }
  if (candidate.email != null && candidate.email.trim().length > 0) {
    errors.push(...validateEmail(candidate.email).errors)
  }
  if (candidate.telefono != null && candidate.telefono.trim().length > 0) {
    errors.push(...validateTelefono(candidate.telefono).errors)
  }
  if (candidate.paisResidencia != null && !PAISES_RESIDENCIA.includes(candidate.paisResidencia)) {
    errors.push(buildSingleFieldError('paisResidencia', MESSAGES.paisResidencia))
  }
  if (candidate.aniosExperiencia != null) {
    errors.push(...validateAniosExperiencia(candidate.aniosExperiencia).errors)
  }
  if (candidate.sectorInteres != null && !SECTORES_INTERES.includes(candidate.sectorInteres)) {
    errors.push(buildSingleFieldError('sectorInteres', MESSAGES.sectorInteres))
  }
  if (candidate.nivelIngles != null && !NIVELES_INGLES.includes(candidate.nivelIngles)) {
    errors.push(buildSingleFieldError('nivelIngles', MESSAGES.nivelIngles))
  }
  if (candidate.disponibilidad != null && !DISPONIBILIDADES.includes(candidate.disponibilidad)) {
    errors.push(buildSingleFieldError('disponibilidad', MESSAGES.disponibilidad))
  }
  errors.push(...validateLinkedin(candidate.linkedin).errors)
  errors.push(...validateComentarios(candidate.comentarios).errors)

  return validationResult(errors)
}