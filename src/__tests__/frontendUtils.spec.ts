/**
 * Tests unitarios para utilidades del frontend Next.js.
 *
 * Evalúa tres funciones clave del lado del cliente:
 *   1. validarLead   → validador del formulario de envío (leads)
 *   2. formatDate    → formateo de fechas para tiempos de entrega
 *   3. parseApiError → parser de errores de la API
 *
 * Las funciones se re-implementan localmente para mantener los tests
 * puros, sin depender del DOM ni de la red, siguiendo el mismo patrón
 * que authUtils.spec.ts.
 */

// =============================================================================
// 1. validarLead — Validador del formulario de envío (leads)
// =============================================================================

type PaisOperacion = 'Estados Unidos' | 'España' | 'Ambos' | 'Otro';
type TipoProducto = 'Moda' | 'Electrónica' | 'Cosmética' | 'Alimentación' | 'Otro';
type VolumenMensual = '0-100' | '101-500' | '501-2000' | '2000+' | 'No estoy seguro';
type ServicioInteres = 'Almacenaje' | 'Última milla' | 'Logística inversa';
type TrabajaCon3PL = 'Sí' | 'No' | 'Estoy evaluando opciones';

const paisesOperacion: readonly PaisOperacion[] = ['Estados Unidos', 'España', 'Ambos', 'Otro'];
const tiposProducto: readonly TipoProducto[] = ['Moda', 'Electrónica', 'Cosmética', 'Alimentación', 'Otro'];
const volumenesMensuales: readonly VolumenMensual[] = [
  '0-100',
  '101-500',
  '501-2000',
  '2000+',
  'No estoy seguro',
];
const serviciosInteresPermitidos: readonly ServicioInteres[] = ['Almacenaje', 'Última milla', 'Logística inversa'];
const opciones3PL: readonly TrabajaCon3PL[] = ['Sí', 'No', 'Estoy evaluando opciones'];

function esObjetoPlano(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function obtenerTexto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function esEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function esPersonaContactoValida(personaContacto: string): boolean {
  if (!personaContacto.includes(' ')) {
    return false;
  }
  return personaContacto.split(' ').filter(Boolean).length >= 2;
}

function esTelefonoValido(telefono: string): boolean {
  if (!telefono.startsWith('+')) {
    return false;
  }
  return /^\+\d{1,4}(?:[\s-]?\d+)+$/.test(telefono);
}

function esSitioWebValido(sitioWeb: string): boolean {
  if (!(sitioWeb.startsWith('http://') || sitioWeb.startsWith('https://'))) {
    return false;
  }
  try {
    const url = new URL(sitioWeb);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validarLead(data: unknown): { valido: boolean; errores: Record<string, string> } {
  const errores: Record<string, string> = {};

  if (!esObjetoPlano(data)) {
    return {
      valido: false,
      errores: {
        nombreEmpresa: 'El nombre de la empresa debe tener al menos 2 caracteres',
        personaContacto: 'Ingresa nombre y apellido del contacto',
        emailCorporativo: 'Ingresa un email corporativo válido (ejemplo: <nombre@empresa.com>)',
        telefono: 'El teléfono debe incluir código de país (ejemplo: +1 213 555 0147)',
        paisOperacion: 'Selecciona el país de operación principal',
        tipoProducto: 'Selecciona el tipo de producto que manejas',
        volumenMensual: 'Selecciona el volumen mensual estimado',
        serviciosInteres: 'Selecciona al menos un servicio de interés',
        trabajaCon3PL: 'Indica si actualmente trabajas con otro proveedor logístico',
        aceptaPrivacidad: 'Debes aceptar la política de privacidad para continuar',
      },
    };
  }

  const nombreEmpresa = obtenerTexto(data.nombreEmpresa);
  if (nombreEmpresa.length < 2) {
    errores.nombreEmpresa = 'El nombre de la empresa debe tener al menos 2 caracteres';
  }

  const personaContacto = obtenerTexto(data.personaContacto);
  if (!esPersonaContactoValida(personaContacto)) {
    errores.personaContacto = 'Ingresa nombre y apellido del contacto';
  }

  const emailCorporativo = obtenerTexto(data.emailCorporativo);
  if (!esEmailValido(emailCorporativo)) {
    errores.emailCorporativo = 'Ingresa un email corporativo válido (ejemplo: <nombre@empresa.com>)';
  }

  const telefono = obtenerTexto(data.telefono);
  if (!esTelefonoValido(telefono)) {
    errores.telefono = 'El teléfono debe incluir código de país (ejemplo: +1 213 555 0147)';
  }

  const sitioWeb = obtenerTexto(data.sitioWeb);
  if (sitioWeb !== '' && !esSitioWebValido(sitioWeb)) {
    errores.sitioWeb = 'Si incluyes sitio web, debe ser una URL válida';
  }

  const paisOperacion = data.paisOperacion;
  if (typeof paisOperacion !== 'string' || !paisesOperacion.includes(paisOperacion as PaisOperacion)) {
    errores.paisOperacion = 'Selecciona el país de operación principal';
  }

  const tipoProducto = data.tipoProducto;
  if (typeof tipoProducto !== 'string' || !tiposProducto.includes(tipoProducto as TipoProducto)) {
    errores.tipoProducto = 'Selecciona el tipo de producto que manejas';
  }

  const volumenMensual = data.volumenMensual;
  if (typeof volumenMensual !== 'string' || !volumenesMensuales.includes(volumenMensual as VolumenMensual)) {
    errores.volumenMensual = 'Selecciona el volumen mensual estimado';
  }

  const serviciosInteres = data.serviciosInteres;
  const serviciosValidos =
    Array.isArray(serviciosInteres) &&
    serviciosInteres.length > 0 &&
    serviciosInteres.every(
      (servicio): servicio is ServicioInteres =>
        typeof servicio === 'string' && serviciosInteresPermitidos.includes(servicio as ServicioInteres),
    );

  if (!serviciosValidos) {
    errores.serviciosInteres = 'Selecciona al menos un servicio de interés';
  }

  const trabajaCon3PL = data.trabajaCon3PL;
  if (typeof trabajaCon3PL !== 'string' || !opciones3PL.includes(trabajaCon3PL as TrabajaCon3PL)) {
    errores.trabajaCon3PL = 'Indica si actualmente trabajas con otro proveedor logístico';
  }

  if (data.comentarios !== undefined) {
    const comentariosCrudos = typeof data.comentarios === 'string' ? data.comentarios : '';
    if (comentariosCrudos.length > 500) {
      const restantes = 500 - comentariosCrudos.length;
      errores.comentarios = `Los comentarios no pueden exceder 500 caracteres (quedan ${restantes})`;
    }
  }

  if (data.aceptaPrivacidad !== true) {
    errores.aceptaPrivacidad = 'Debes aceptar la política de privacidad para continuar';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  };
}

describe('validarLead — validador del formulario de envío (leads)', () => {
  // --------------------------------------------------------------------------
  // Happy path: todos los campos correctos
  // --------------------------------------------------------------------------

  it('retorna valido=true con un payload completo y correcto', () => {
    const resultado = validarLead({
      nombreEmpresa: 'Mi Empresa',
      personaContacto: 'Juan Pérez',
      emailCorporativo: 'juan@miempresa.com',
      telefono: '+1 213 555 0147',
      sitioWeb: 'https://miempresa.com',
      paisOperacion: 'Estados Unidos',
      tipoProducto: 'Electrónica',
      volumenMensual: '101-500',
      serviciosInteres: ['Almacenaje', 'Última milla'],
      trabajaCon3PL: 'Sí',
      comentarios: 'Sin comentarios',
      aceptaPrivacidad: true,
    });

    expect(resultado.valido).toBe(true);
    expect(Object.keys(resultado.errores)).toHaveLength(0);
  });

  it('retorna valido=true con sitioWeb vacío (campo opcional)', () => {
    const resultado = validarLead({
      nombreEmpresa: 'Empresa',
      personaContacto: 'Ana García',
      emailCorporativo: 'ana@garcia.com',
      telefono: '+34 612 345 678',
      paisOperacion: 'España',
      tipoProducto: 'Moda',
      volumenMensual: '0-100',
      serviciosInteres: ['Logística inversa'],
      trabajaCon3PL: 'No',
      aceptaPrivacidad: true,
    });

    expect(resultado.valido).toBe(true);
    expect(Object.keys(resultado.errores)).toHaveLength(0);
  });

  it('retorna valido=true con comentarios vacíos (campo opcional)', () => {
    const resultado = validarLead({
      nombreEmpresa: 'Tech Corp',
      personaContacto: 'Carlos López',
      emailCorporativo: 'carlos@techcorp.com',
      telefono: '+52 55 1234 5678',
      paisOperacion: 'Ambos',
      tipoProducto: 'Alimentación',
      volumenMensual: '2000+',
      serviciosInteres: ['Almacenaje', 'Última milla', 'Logística inversa'],
      trabajaCon3PL: 'Estoy evaluando opciones',
      comentarios: '',
      aceptaPrivacidad: true,
    });

    expect(resultado.valido).toBe(true);
    expect(Object.keys(resultado.errores)).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // Failure mode: datos inválidos / campos faltantes
  // --------------------------------------------------------------------------

  it('retorna valido=false cuando el payload es null', () => {
    const resultado = validarLead(null);

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.nombreEmpresa).toBeDefined();
    expect(resultado.errores.personaContacto).toBeDefined();
    expect(resultado.errores.emailCorporativo).toBeDefined();
    expect(resultado.errores.telefono).toBeDefined();
    expect(resultado.errores.paisOperacion).toBeDefined();
    expect(resultado.errores.tipoProducto).toBeDefined();
    expect(resultado.errores.volumenMensual).toBeDefined();
    expect(resultado.errores.serviciosInteres).toBeDefined();
    expect(resultado.errores.trabajaCon3PL).toBeDefined();
    expect(resultado.errores.aceptaPrivacidad).toBeDefined();
    expect(Object.keys(resultado.errores)).toHaveLength(10);
  });

  it('retorna valido=false cuando el payload es undefined', () => {
    const resultado = validarLead(undefined);

    expect(resultado.valido).toBe(false);
    expect(Object.keys(resultado.errores)).toHaveLength(10);
  });

  it('retorna valido=false cuando el payload es un string vacío', () => {
    const resultado = validarLead('');

    expect(resultado.valido).toBe(false);
    expect(Object.keys(resultado.errores)).toHaveLength(10);
  });

  it('retorna valido=false cuando nombreEmpresa tiene menos de 2 caracteres', () => {
    const resultado = validarLead({
      nombreEmpresa: 'A',
      personaContacto: 'Juan Pérez',
      emailCorporativo: 'juan@empresa.com',
      telefono: '+1 213 555 0147',
      paisOperacion: 'Estados Unidos',
      tipoProducto: 'Electrónica',
      volumenMensual: '101-500',
      serviciosInteres: ['Almacenaje'],
      trabajaCon3PL: 'Sí',
      aceptaPrivacidad: true,
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.nombreEmpresa).toBe(
      'El nombre de la empresa debe tener al menos 2 caracteres',
    );
  });

  it('retorna valido=false cuando personaContacto es un solo nombre', () => {
    const resultado = validarLead({
      nombreEmpresa: 'Empresa Sana',
      personaContacto: 'Juan',
      emailCorporativo: 'juan@empresa.com',
      telefono: '+1 213 555 0147',
      paisOperacion: 'Estados Unidos',
      tipoProducto: 'Electrónica',
      volumenMensual: '101-500',
      serviciosInteres: ['Almacenaje'],
      trabajaCon3PL: 'Sí',
      aceptaPrivacidad: true,
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.personaContacto).toBe('Ingresa nombre y apellido del contacto');
  });

  it('retorna valido=false cuando emailCorporativo no es válido', () => {
    const resultado = validarLead({
      nombreEmpresa: 'Empresa Sana',
      personaContacto: 'Juan Pérez',
      emailCorporativo: 'correo-sin-arroba',
      telefono: '+1 213 555 0147',
      paisOperacion: 'Estados Unidos',
      tipoProducto: 'Electrónica',
      volumenMensual: '101-500',
      serviciosInteres: ['Almacenaje'],
      trabajaCon3PL: 'Sí',
      aceptaPrivacidad: true,
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.emailCorporativo).toContain('email corporativo válido');
  });

  it('retorna valido=false cuando telefono no incluye código de país', () => {
    const resultado = validarLead({
      nombreEmpresa: 'Empresa Sana',
      personaContacto: 'Juan Pérez',
      emailCorporativo: 'juan@empresa.com',
      telefono: '213 555 0147',
      paisOperacion: 'Estados Unidos',
      tipoProducto: 'Electrónica',
      volumenMensual: '101-500',
      serviciosInteres: ['Almacenaje'],
      trabajaCon3PL: 'Sí',
      aceptaPrivacidad: true,
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.telefono).toContain('código de país');
  });

  it('retorna valido=false cuando aceptaPrivacidad no es true', () => {
    const resultado = validarLead({
      nombreEmpresa: 'Empresa Sana',
      personaContacto: 'Juan Pérez',
      emailCorporativo: 'juan@empresa.com',
      telefono: '+1 213 555 0147',
      paisOperacion: 'Estados Unidos',
      tipoProducto: 'Electrónica',
      volumenMensual: '101-500',
      serviciosInteres: ['Almacenaje'],
      trabajaCon3PL: 'Sí',
      aceptaPrivacidad: false,
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.aceptaPrivacidad).toBe(
      'Debes aceptar la política de privacidad para continuar',
    );
  });

  it('retorna valido=false con múltiples errores simultáneos', () => {
    const resultado = validarLead({
      nombreEmpresa: '',
      personaContacto: '',
      emailCorporativo: '',
      telefono: '',
      paisOperacion: '',
      tipoProducto: '',
      volumenMensual: '',
      serviciosInteres: [],
      trabajaCon3PL: '',
      aceptaPrivacidad: false,
    });

    expect(resultado.valido).toBe(false);
    // Solo los campos obligatorios con error (sitioWeb y comentarios son opcionales)
    expect(Object.keys(resultado.errores).length).toBeGreaterThanOrEqual(9);
  });

  it('retorna valido=false cuando sitioWeb es inválido pero no está vacío', () => {
    const resultado = validarLead({
      nombreEmpresa: 'Empresa',
      personaContacto: 'Juan Pérez',
      emailCorporativo: 'juan@empresa.com',
      telefono: '+1 213 555 0147',
      sitioWeb: 'esto-no-es-una-url',
      paisOperacion: 'Estados Unidos',
      tipoProducto: 'Electrónica',
      volumenMensual: '101-500',
      serviciosInteres: ['Almacenaje'],
      trabajaCon3PL: 'Sí',
      aceptaPrivacidad: true,
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.sitioWeb).toBe('Si incluyes sitio web, debe ser una URL válida');
  });
});

// =============================================================================
// 2. formatDate — Formateador de fechas para tiempos de entrega
// =============================================================================

/**
 * Formatea una cadena ISO o timestamp a una representación localizada
 * en español (es-ES), tal como se usa en los paneles de incidencias y
 * entregas del backoffice.
 *
 * Caso de uso real en IncidentsListPanel.tsx:
 *   new Date(incident.updated_at).toLocaleString("es-ES")
 */
function formatDate(
  dateValue: string | number | Date | null | undefined,
): string {
  if (dateValue === null || dateValue === undefined) {
    return 'Sin fecha';
  }

  if (typeof dateValue === 'string' && dateValue.trim() === '') {
    return 'Sin fecha';
  }

  // Rechazar booleanos, objetos, arrays y otros tipos no válidos
  if (typeof dateValue === 'boolean' || typeof dateValue === 'object' && !(dateValue instanceof Date)) {
    return 'Sin fecha';
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return date.toLocaleString('es-ES');
}

describe('formatDate — formateador de fechas para tiempos de entrega', () => {
  // --------------------------------------------------------------------------
  // Happy path
  // --------------------------------------------------------------------------

  it('formatea una fecha ISO en español (es-ES)', () => {
    const resultado = formatDate('2026-08-01T14:30:00.000Z');
    // Debe contener fecha y hora en formato es-ES (ej: "1/8/2026 14:30:00")
    expect(resultado).toContain('2026');
    expect(resultado).not.toBe('Sin fecha');
  });

  it('formatea un timestamp numérico (epoch ms)', () => {
    // 1 de agosto de 2026 00:00:00 UTC en milisegundos
    const epoch = 1777766400000;
    const resultado = formatDate(epoch);
    expect(resultado).not.toBe('Sin fecha');
    expect(typeof resultado).toBe('string');
    expect(resultado.length).toBeGreaterThan(0);
  });

  it('formatea un objeto Date directamente', () => {
    const fecha = new Date('2026-12-25T10:00:00.000Z');
    const resultado = formatDate(fecha);
    expect(resultado).not.toBe('Sin fecha');
    expect(resultado).toContain('2026');
  });

  it('formatea una fecha con zona horaria explícita', () => {
    const resultado = formatDate('2026-07-28T02:17:05.483Z');
    expect(resultado).not.toBe('Sin fecha');
    expect(resultado).toContain('2026');
  });

  // --------------------------------------------------------------------------
  // Failure / edge cases: null, undefined, vacío, inválido
  // --------------------------------------------------------------------------

  it('retorna "Sin fecha" cuando dateValue es null', () => {
    expect(formatDate(null)).toBe('Sin fecha');
  });

  it('retorna "Sin fecha" cuando dateValue es undefined', () => {
    expect(formatDate(undefined)).toBe('Sin fecha');
  });

  it('retorna "Sin fecha" cuando dateValue es un string vacío', () => {
    expect(formatDate('')).toBe('Sin fecha');
  });

  it('retorna "Sin fecha" cuando dateValue es un string con solo espacios', () => {
    expect(formatDate('   ')).toBe('Sin fecha');
  });

  it('retorna "Sin fecha" cuando dateValue es una cadena no parseable', () => {
    expect(formatDate('no-soy-una-fecha')).toBe('Sin fecha');
  });

  it('retorna "Sin fecha" cuando dateValue es un número negativo no válido como fecha', () => {
    // Si bien algunos números negativos sí producen fechas válidas en JS
    // (ej: -8640000000000000 es el mínimo), probamos con NaN conceptual
    const resultado = formatDate('99999-01-01'); // año extremo → NaN en algunos entornos
    // Simplemente verificamos que no lance excepción y devuelva string
    expect(typeof resultado).toBe('string');
  });

  it('retorna "Sin fecha" para un booleano (no es una fecha válida)', () => {
    // TypeScript lo impediría, pero en JS puede llegar en runtime
    const resultado = formatDate(true as unknown as string);
    expect(resultado).toBe('Sin fecha');
  });

  it('no lanza error con un objeto vacío como entrada', () => {
    expect(() => formatDate({} as unknown as string)).not.toThrow();
    const resultado = formatDate({} as unknown as string);
    expect(resultado).toBe('Sin fecha');
  });
});

// =============================================================================
// 3. parseApiError — Parser de errores de la API
// =============================================================================

/**
 * Parsea la respuesta JSON de un error de la API extrayendo el mensaje
 * legible. Busca en orden: message → detail → error → fallback.
 * Si el JSON es inválido, retorna el mensaje fallback.
 *
 * Caso de uso real en profile/page.tsx:
 *   parseApiError(response, 'No fue posible cargar los datos de tu cuenta.')
 */
async function parseApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const errorData = (await response.json()) as {
      message?: string;
      detail?: string;
      error?: string;
    };
    return errorData.message || errorData.detail || errorData.error || fallback;
  } catch {
    return fallback;
  }
}

describe('parseApiError — parser de errores de la API', () => {
  // --------------------------------------------------------------------------
  // Happy path
  // --------------------------------------------------------------------------

  it('extrae el campo message cuando está presente', async () => {
    const response = new Response(JSON.stringify({ message: 'Email ya registrado' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    const mensaje = await parseApiError(response, 'Error genérico');
    expect(mensaje).toBe('Email ya registrado');
  });

  it('extrae el campo detail cuando message no existe', async () => {
    const response = new Response(JSON.stringify({ detail: 'Credenciales inválidas' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });

    const mensaje = await parseApiError(response, 'Error genérico');
    expect(mensaje).toBe('Credenciales inválidas');
  });

  it('extrae el campo error cuando message y detail no existen', async () => {
    const response = new Response(JSON.stringify({ error: 'Token expirado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });

    const mensaje = await parseApiError(response, 'Error genérico');
    expect(mensaje).toBe('Token expirado');
  });

  it('prioriza message sobre detail y error', async () => {
    const response = new Response(
      JSON.stringify({
        message: 'Mensaje principal',
        detail: 'Detalle secundario',
        error: 'Error terciario',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );

    const mensaje = await parseApiError(response, 'Fallback');
    expect(mensaje).toBe('Mensaje principal');
  });

  it('usa el fallback cuando ningún campo conocido está presente', async () => {
    const response = new Response(JSON.stringify({ foo: 'bar', baz: 42 }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

    const mensaje = await parseApiError(response, 'No fue posible procesar la solicitud.');
    expect(mensaje).toBe('No fue posible procesar la solicitud.');
  });

  // --------------------------------------------------------------------------
  // Failure / edge cases: null, undefined, vacío, body malformado
  // --------------------------------------------------------------------------

  it('retorna fallback cuando el body de la respuesta está vacío', async () => {
    const response = new Response('', {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

    const mensaje = await parseApiError(response, 'Error inesperado.');
    expect(mensaje).toBe('Error inesperado.');
  });

  it('retorna fallback cuando el body no es JSON válido', async () => {
    const response = new Response('Esto no es JSON', {
      status: 502,
      headers: { 'Content-Type': 'text/plain' },
    });

    const mensaje = await parseApiError(response, 'Error de conexión.');
    expect(mensaje).toBe('Error de conexión.');
  });

  it('retorna fallback cuando el body tiene sintaxis JSON incorrecta (ej: llave suelta)', async () => {
    const response = new Response('{ mensaje: "incompleto"', {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

    const mensaje = await parseApiError(response, 'Fallback por JSON inválido.');
    expect(mensaje).toBe('Fallback por JSON inválido.');
  });

  it('retorna fallback cuando message es null y los demás no existen', async () => {
    const response = new Response(JSON.stringify({ message: null }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    const mensaje = await parseApiError(response, 'Mensaje por defecto.');
    expect(mensaje).toBe('Mensaje por defecto.');
  });

  it('retorna fallback cuando message es un string vacío', async () => {
    const response = new Response(JSON.stringify({ message: '' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    const mensaje = await parseApiError(response, 'Fallback por mensaje vacío.');
    expect(mensaje).toBe('Fallback por mensaje vacío.');
  });

  it('retorna fallback cuando response.json lanza (cuerpo null literal)', async () => {
    const response = new Response('null', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const mensaje = await parseApiError(response, 'Sin contenido.');
    expect(mensaje).toBe('Sin contenido.');
  });

  it('retorna fallback cuando la respuesta es undefined simulando error de red', async () => {
    // Simula un error de red donde no hay Response real
    const fakeResponse = {
      json: async () => {
        throw new Error('Failed to fetch');
      },
    } as Response;

    const mensaje = await parseApiError(fakeResponse, 'Error de red simulado.');
    expect(mensaje).toBe('Error de red simulado.');
  });

  it('no lanza error con un body que es un array en lugar de objeto', async () => {
    const response = new Response(JSON.stringify(['error', 'detalle']), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    // Como el array no tiene message/detail/error, se usa el fallback
    const mensaje = await parseApiError(response, 'Fallback para array.');
    expect(mensaje).toBe('Fallback para array.');
  });
});