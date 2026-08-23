import {
  Candidate,
  Employee,
  Service,
  DISPONIBILIDADES,
  NIVELES_INGLES,
  PAISES_RESIDENCIA,
  SECTORES_INTERES
} from './types/models'
import {
  filterBy,
  filterCandidatesByDisponibilidad,
  filterCandidatesByExperience,
  filterCandidatesBySector,
  groupBy,
  groupCandidatesBySector,
  sortBy,
  sortByMultiple
} from './utils/collections'
import {
  binarySearch,
  binarySearchByExperience,
  findCandidateByEmail,
  findCandidateById,
  findCandidatesByNivelIngles,
  linearSearch,
  linearSearchAll
} from './utils/search'
import {
  average,
  countByCategory,
  findMax,
  findMin,
  generateCandidateReport,
  sumField,
  topCandidatesBySector
} from './utils/transformations'
import {
  hasRequiredFields,
  validateAniosExperiencia,
  validateCandidate,
  validateComentarios,
  validateEmail,
  validateLinkedin,
  validateNombreCompleto,
  validateTelefono
} from './utils/validations'

const candidatos: Candidate[] = [
  {
    id: 'cand-001',
    nombreCompleto: 'Lucia Hernandez',
    email: 'lucia.hernandez@email.com',
    telefono: '+34 612 345 678',
    paisResidencia: 'España',
    aniosExperiencia: 8,
    sectorInteres: 'Tecnología',
    nivelIngles: 'Avanzado',
    disponibilidad: 'Inmediata',
    linkedin: 'https://linkedin.com/in/luciahernandez',
    comentarios: 'Experiencia en liderazgo de equipos de producto.',
    aceptaPolitica: true,
    fechaRegistro: new Date('2026-05-12')
  },
  {
    id: 'cand-002',
    nombreCompleto: 'Miguel Torres',
    email: 'miguel.torres@email.com',
    telefono: '+1 305 555 1111',
    paisResidencia: 'Estados Unidos',
    aniosExperiencia: 5,
    sectorInteres: 'Retail',
    nivelIngles: 'Nativo',
    disponibilidad: '1 mes',
    linkedin: 'https://linkedin.com/in/migueltorres',
    aceptaPolitica: true,
    fechaRegistro: new Date('2026-06-02')
  },
  {
    id: 'cand-003',
    nombreCompleto: 'Ana Morales',
    email: 'ana.morales@email.com',
    telefono: '+34 699 111 222',
    paisResidencia: 'España',
    aniosExperiencia: 12,
    sectorInteres: 'Servicios Financieros',
    nivelIngles: 'Intermedio',
    disponibilidad: '2-3 meses',
    comentarios: 'Abierta a posiciones regionales.',
    aceptaPolitica: true,
    fechaRegistro: new Date('2026-04-28')
  },
  {
    id: 'cand-004',
    nombreCompleto: 'Carlos Vega',
    email: 'c.vega@email.com',
    telefono: '+57 320 555 8888',
    paisResidencia: 'Otro',
    aniosExperiencia: 3,
    sectorInteres: 'Consultoría',
    nivelIngles: 'Básico',
    disponibilidad: 'Solo explorando',
    aceptaPolitica: true,
    fechaRegistro: new Date('2026-07-11')
  },
  {
    id: 'cand-005',
    nombreCompleto: 'Sofia Ruiz',
    email: 'sofia.ruiz@email.com',
    telefono: '+34 611 234 123',
    paisResidencia: 'España',
    aniosExperiencia: 8,
    sectorInteres: 'Tecnología',
    nivelIngles: 'Avanzado',
    disponibilidad: 'Inmediata',
    linkedin: 'https://linkedin.com/in/sofiaruiz',
    aceptaPolitica: true,
    fechaRegistro: new Date('2026-08-01')
  }
]

const servicios: Service[] = [
  {
    id: 'srv-001',
    nombre: 'Headhunting Ejecutivo',
    descripcion: 'Búsqueda estratégica para roles clave.',
    caracteristicas: ['Perfiles directivos', 'Garantía de reemplazo'],
    sectoresObjetivo: ['Tecnología', 'Retail'],
    activo: true
  },
  {
    id: 'srv-002',
    nombre: 'Outsourcing de Atención al Cliente',
    descripcion: 'Equipos especializados para empresas tecnológicas.',
    caracteristicas: ['Formación continua', 'Supervisión dedicada'],
    sectoresObjetivo: ['Tecnología', 'Servicios Financieros'],
    activo: true
  },
  {
    id: 'srv-003',
    nombre: 'Formación Corporativa',
    descripcion: 'Programas en soft skills y liderazgo.',
    caracteristicas: ['Formatos híbridos', 'Programas a medida'],
    sectoresObjetivo: ['Retail', 'Servicios Financieros'],
    activo: true
  }
]

const empleados: Employee[] = [
  {
    id: 'emp-001',
    nombreCompleto: 'Carmen Ruiz',
    email: 'carmen.ruiz@nexova.com',
    departamento: 'Marketing y Comunicaciones',
    cargo: 'Head of Marketing',
    oficina: 'Valencia',
    aniosEnEmpresa: 6,
    activo: true
  },
  {
    id: 'emp-002',
    nombreCompleto: 'Daniel Smith',
    email: 'daniel.smith@nexova.com',
    departamento: 'Talent Acquisition',
    cargo: 'Senior Recruiter',
    oficina: 'Miami',
    aniosEnEmpresa: 4,
    activo: true
  }
]

console.log('\n=== Datos base ===')
console.log('Candidatos:', candidatos.length)
console.log('Servicios:', servicios.length)
console.log('Empleados:', empleados.length)
console.log('Catálogos:', {
  PAISES_RESIDENCIA,
  SECTORES_INTERES,
  NIVELES_INGLES,
  DISPONIBILIDADES
})

console.log('\n=== Collections ===')
console.log('filterBy (experiencia > 7):', filterBy(candidatos, (c) => c.aniosExperiencia > 7).length)
console.log('filterCandidatesBySector Tecnología:', filterCandidatesBySector(candidatos, 'Tecnología').length)
console.log('filterCandidatesByExperience 4..10:', filterCandidatesByExperience(candidatos, 4, 10).length)
console.log(
  'filterCandidatesByDisponibilidad Inmediata:',
  filterCandidatesByDisponibilidad(candidatos, 'Inmediata').length
)
console.log('sortBy aniosExperiencia asc:', sortBy(candidatos, 'aniosExperiencia', 'asc').map((c) => c.id))
console.log(
  'sortByMultiple sector + experiencia desc:',
  sortByMultiple(candidatos, [
    { key: 'sectorInteres', order: 'asc' },
    { key: 'aniosExperiencia', order: 'desc' }
  ]).map((c) => `${c.id}:${c.sectorInteres}:${c.aniosExperiencia}`)
)
console.log('groupBy por país:', Object.keys(groupBy(candidatos, (c) => c.paisResidencia)))
console.log(
  'groupCandidatesBySector tamaños:',
  Object.fromEntries(
    Object.entries(groupCandidatesBySector(candidatos)).map(([key, value]) => [key, value.length])
  )
)
console.log('Casos límite collections (vacío):', {
  filterBy: filterBy([], () => true),
  sortBy: sortBy([], 'id', 'asc'),
  groupBy: groupBy([], (n: number) => String(n))
})

console.log('\n=== Search ===')
console.log('linearSearch id cand-003:', linearSearch(candidatos, (c) => c.id === 'cand-003')?.nombreCompleto)
console.log('linearSearch no existe:', linearSearch(candidatos, (c) => c.id === 'cand-999'))
console.log('linearSearchAll inglés Avanzado:', linearSearchAll(candidatos, (c) => c.nivelIngles === 'Avanzado').length)
console.log('findCandidateByEmail existente:', findCandidateByEmail(candidatos, 'ana.morales@email.com')?.id)
console.log('findCandidateByEmail inexistente:', findCandidateByEmail(candidatos, 'nadie@nexova.com'))
console.log('findCandidateById cand-001:', findCandidateById(candidatos, 'cand-001')?.nombreCompleto)
console.log('findCandidatesByNivelIngles Nativo:', findCandidatesByNivelIngles(candidatos, 'Nativo').map((c) => c.id))

const candidatosOrdenadosPorExp = sortBy(candidatos, 'aniosExperiencia', 'asc')
console.log(
  'binarySearch genérico por aniosExperiencia=8:',
  binarySearch(candidatosOrdenadosPorExp, 'aniosExperiencia', 8)
)
console.log('binarySearchByExperience=12:', binarySearchByExperience(candidatosOrdenadosPorExp, 12))
console.log('binarySearchByExperience no existe (99):', binarySearchByExperience(candidatosOrdenadosPorExp, 99))

console.log('\n=== Transformations ===')
console.log('countByCategory por sector:', countByCategory(candidatos, (c) => c.sectorInteres))
console.log('sumField experiencia total:', sumField(candidatos, (c) => c.aniosExperiencia))
console.log('average experiencia:', average(candidatos, (c) => c.aniosExperiencia))
console.log('findMax experiencia:', findMax(candidatos, (c) => c.aniosExperiencia)?.id)
console.log('findMin experiencia:', findMin(candidatos, (c) => c.aniosExperiencia)?.id)
console.log('generateCandidateReport:', generateCandidateReport(candidatos))
console.log(
  'topCandidatesBySector Tecnología top 2:',
  topCandidatesBySector(candidatos, 'Tecnología', 2).map((c) => `${c.id}:${c.aniosExperiencia}`)
)
console.log('Casos límite transformations (vacío):', {
  average: average([], (n: number) => n),
  findMax: findMax([], (n: number) => n),
  findMin: findMin([], (n: number) => n),
  report: generateCandidateReport([])
})

console.log('\n=== Validations ===')
console.log('validateEmail OK:', validateEmail('persona@empresa.com'))
console.log('validateEmail FAIL:', validateEmail('correo-invalido'))
console.log('validateTelefono OK:', validateTelefono('+34 600 123 456'))
console.log('validateTelefono FAIL:', validateTelefono('600123456'))
console.log('validateLinkedin OK:', validateLinkedin('https://linkedin.com/in/perfil'))
console.log('validateLinkedin FAIL:', validateLinkedin('linkedin.com/in/perfil'))
console.log('validateComentarios OK:', validateComentarios('Texto breve'))
console.log('validateComentarios FAIL:', validateComentarios('a'.repeat(501)))
console.log('validateAniosExperiencia OK:', validateAniosExperiencia(10))
console.log('validateAniosExperiencia FAIL:', validateAniosExperiencia(51))
console.log('validateNombreCompleto OK:', validateNombreCompleto('Maria Lopez'))
console.log('validateNombreCompleto FAIL:', validateNombreCompleto('Maria'))

const candidatoInvalido = {
  id: '',
  nombreCompleto: 'SoloNombre',
  email: 'correo-sin-dominio',
  telefono: '12345',
  paisResidencia: 'España',
  aniosExperiencia: 80,
  sectorInteres: 'Retail',
  nivelIngles: 'Básico',
  disponibilidad: 'Inmediata',
  linkedin: 'linkedin-invalido',
  comentarios: 'b'.repeat(600),
  aceptaPolitica: false,
  fechaRegistro: new Date('2026-01-01')
} satisfies Partial<Candidate>

console.log('hasRequiredFields candidato inválido:', hasRequiredFields(candidatoInvalido))
console.log('validateCandidate (acumula múltiples errores):', validateCandidate(candidatoInvalido))

console.log('\n=== Fin demo Hito 2 ===')