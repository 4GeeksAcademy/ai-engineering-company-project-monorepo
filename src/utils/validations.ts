import type {
  Lead,
  PaisOperacion,
  ServicioInteres,
  TipoProducto,
  TrabajaCon3PL,
  VolumenMensual,
} from '../types/models';

export type Unknown = unknown;

export type ResultadoValidacionLead = {
  valido: boolean;
  errores: Record<string, string>;
};

const mensajeAdvertenciaVolumenBajo =
  'Para volúmenes menores a 100 envíos mensuales, nuestros servicios podrían no ser la solución más eficiente. ¿Seguro que quieres continuar?';

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

function incluirError(errores: Record<string, string>, campo: keyof Lead | string, mensaje: string): void {
  errores[campo] = mensaje;
}

export function validarLead(data: Unknown): { valido: boolean; errores: Record<string, string> } {
  const errores: Record<string, string> = {};

  if (!esObjetoPlano(data)) {
    incluirError(errores, 'nombreEmpresa', 'El nombre de la empresa debe tener al menos 2 caracteres');
    incluirError(errores, 'personaContacto', 'Ingresa nombre y apellido del contacto');
    incluirError(
      errores,
      'emailCorporativo',
      'Ingresa un email corporativo válido (ejemplo: <nombre@empresa.com>)'
    );
    incluirError(errores, 'telefono', 'El teléfono debe incluir código de país (ejemplo: +1 213 555 0147)');
    incluirError(errores, 'paisOperacion', 'Selecciona el país de operación principal');
    incluirError(errores, 'tipoProducto', 'Selecciona el tipo de producto que manejas');
    incluirError(errores, 'volumenMensual', 'Selecciona el volumen mensual estimado');
    incluirError(errores, 'serviciosInteres', 'Selecciona al menos un servicio de interés');
    incluirError(errores, 'trabajaCon3PL', 'Indica si actualmente trabajas con otro proveedor logístico');
    incluirError(errores, 'aceptaPrivacidad', 'Debes aceptar la política de privacidad para continuar');

    return { valido: false, errores };
  }

  const nombreEmpresa = obtenerTexto(data.nombreEmpresa);
  if (nombreEmpresa.length < 2) {
    incluirError(errores, 'nombreEmpresa', 'El nombre de la empresa debe tener al menos 2 caracteres');
  }

  const personaContacto = obtenerTexto(data.personaContacto);
  if (!esPersonaContactoValida(personaContacto)) {
    incluirError(errores, 'personaContacto', 'Ingresa nombre y apellido del contacto');
  }

  const emailCorporativo = obtenerTexto(data.emailCorporativo);
  if (!esEmailValido(emailCorporativo)) {
    incluirError(
      errores,
      'emailCorporativo',
      'Ingresa un email corporativo válido (ejemplo: <nombre@empresa.com>)'
    );
  }

  const telefono = obtenerTexto(data.telefono);
  if (!esTelefonoValido(telefono)) {
    incluirError(errores, 'telefono', 'El teléfono debe incluir código de país (ejemplo: +1 213 555 0147)');
  }

  const sitioWeb = obtenerTexto(data.sitioWeb);
  if (sitioWeb !== '' && !esSitioWebValido(sitioWeb)) {
    incluirError(errores, 'sitioWeb', 'Si incluyes sitio web, debe ser una URL válida');
  }

  const paisOperacion = data.paisOperacion;
  if (typeof paisOperacion !== 'string' || !paisesOperacion.includes(paisOperacion as PaisOperacion)) {
    incluirError(errores, 'paisOperacion', 'Selecciona el país de operación principal');
  }

  const tipoProducto = data.tipoProducto;
  if (typeof tipoProducto !== 'string' || !tiposProducto.includes(tipoProducto as TipoProducto)) {
    incluirError(errores, 'tipoProducto', 'Selecciona el tipo de producto que manejas');
  }

  const volumenMensual = data.volumenMensual;
  if (typeof volumenMensual !== 'string' || !volumenesMensuales.includes(volumenMensual as VolumenMensual)) {
    incluirError(errores, 'volumenMensual', 'Selecciona el volumen mensual estimado');
  }

  const serviciosInteres = data.serviciosInteres;
  const serviciosValidos =
    Array.isArray(serviciosInteres) &&
    serviciosInteres.length > 0 &&
    serviciosInteres.every(
      (servicio): servicio is ServicioInteres =>
        typeof servicio === 'string' && serviciosInteresPermitidos.includes(servicio as ServicioInteres)
    );

  if (!serviciosValidos) {
    incluirError(errores, 'serviciosInteres', 'Selecciona al menos un servicio de interés');
  }

  const trabajaCon3PL = data.trabajaCon3PL;
  if (typeof trabajaCon3PL !== 'string' || !opciones3PL.includes(trabajaCon3PL as TrabajaCon3PL)) {
    incluirError(errores, 'trabajaCon3PL', 'Indica si actualmente trabajas con otro proveedor logístico');
  }

  if (data.comentarios !== undefined) {
    const comentariosCrudos = typeof data.comentarios === 'string' ? data.comentarios : '';
    if (comentariosCrudos.length > 500) {
      const restantes = 500 - comentariosCrudos.length;
      incluirError(
        errores,
        'comentarios',
        `Los comentarios no pueden exceder 500 caracteres (quedan ${restantes})`
      );
    }
  }

  if (data.aceptaPrivacidad !== true) {
    incluirError(errores, 'aceptaPrivacidad', 'Debes aceptar la política de privacidad para continuar');
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  };
}

export function obtenerAdvertenciaVolumenBajo(data: Unknown): string | null {
  if (!esObjetoPlano(data)) {
    return null;
  }

  const volumenMensual = data.volumenMensual;
  const tipoProducto = data.tipoProducto;
  const tipoProductoEsValido =
    typeof tipoProducto === 'string' && tiposProducto.includes(tipoProducto as TipoProducto);

  if (volumenMensual === '0-100' && tipoProductoEsValido) {
    return mensajeAdvertenciaVolumenBajo;
  }

  return null;
}
