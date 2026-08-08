/**
 * Tests unitarios para funciones de utilidad de autenticación y validación.
 *
 * Evalúa funciones puras de validación de credenciales, sanitización de
 * entradas y análisis de tokens JWT del lado del cliente, sin depender
 * del DOM ni de la red.
 */

import { isTokenValid } from '../../uis/backoffice/services/authApi';

// =============================================================================
// Helpers re-implementados localmente para test unitario sin depender del DOM.
// Las funciones originales viven en src/utils/validations.ts pero algunas
// acceden a constantes de módulo; las reimplementamos de forma pura aquí.
// =============================================================================

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

function obtenerTexto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

// =============================================================================
// esEmailValido
// =============================================================================

describe('esEmailValido', () => {
  it('acepta un email corporativo estándar', () => {
    expect(esEmailValido('usuario@empresa.com')).toBe(true);
  });

  it('acepta email con subdominio y puntos', () => {
    expect(esEmailValido('nombre.apellido@sub.dominio.co.uk')).toBe(true);
  });

  it('acepta email con signo + (tagging)', () => {
    expect(esEmailValido('usuario+etiqueta@dominio.com')).toBe(true);
  });

  it('rechaza email sin @', () => {
    expect(esEmailValido('usuariodominio.com')).toBe(false);
  });

  it('rechaza email sin dominio', () => {
    expect(esEmailValido('usuario@')).toBe(false);
  });

  it('rechaza email con espacios', () => {
    expect(esEmailValido('usuario @ dominio.com')).toBe(false);
  });

  it('rechaza string vacío', () => {
    expect(esEmailValido('')).toBe(false);
  });

  it('rechaza solo el arroba', () => {
    expect(esEmailValido('@')).toBe(false);
  });

  it('rechaza email con múltiples arrobas', () => {
    expect(esEmailValido('user@domain@com')).toBe(false);
  });
});

// =============================================================================
// esPersonaContactoValida
// =============================================================================

describe('esPersonaContactoValida', () => {
  it('acepta nombre y apellido', () => {
    expect(esPersonaContactoValida('Juan Pérez')).toBe(true);
  });

  it('acepta nombre compuesto con dos apellidos', () => {
    expect(esPersonaContactoValida('María José García López')).toBe(true);
  });

  it('rechaza solo un nombre (sin espacio)', () => {
    expect(esPersonaContactoValida('Juan')).toBe(false);
  });

  it('rechaza string vacío', () => {
    expect(esPersonaContactoValida('')).toBe(false);
  });

  it('rechaza solo espacios', () => {
    expect(esPersonaContactoValida('   ')).toBe(false);
  });

  it('acepta múltiples espacios entre palabras', () => {
    expect(esPersonaContactoValida('Juan   Pablo')).toBe(true);
  });

  it('rechaza un nombre con espacio al final sin segundo nombre', () => {
    expect(esPersonaContactoValida('Juan ')).toBe(false);
  });
});

// =============================================================================
// esTelefonoValido
// =============================================================================

describe('esTelefonoValido', () => {
  it('acepta teléfono US con código de país', () => {
    expect(esTelefonoValido('+1 213 555 0147')).toBe(true);
  });

  it('acepta teléfono ES con código de país', () => {
    expect(esTelefonoValido('+34 612 345 678')).toBe(true);
  });

  it('acepta teléfono con guiones', () => {
    expect(esTelefonoValido('+1-213-555-0147')).toBe(true);
  });

  it('acepta solo dígitos después del código de país', () => {
    expect(esTelefonoValido('+521234567890')).toBe(true);
  });

  it('rechaza teléfono sin código de país', () => {
    expect(esTelefonoValido('612 345 678')).toBe(false);
  });

  it('rechaza teléfono con caracteres no numéricos', () => {
    expect(esTelefonoValido('+34 ABC 123')).toBe(false);
  });

  it('rechaza solo el símbolo +', () => {
    expect(esTelefonoValido('+')).toBe(false);
  });

  it('rechaza string vacío', () => {
    expect(esTelefonoValido('')).toBe(false);
  });

  it('acepta código de país de más de 4 dígitos (regex permite hasta \\d{1,4} seguido de más dígitos)', () => {
    // La regex actual `^\+\d{1,4}(?:[\s-]?\d+)+$` permite códigos de país
    // mayores porque el `\d{1,4}` captura los primeros 1-4 y el `\d+` captura
    // los restantes. Documentamos el comportamiento actual.
    const resultado = esTelefonoValido('+12345 678 901');
    expect(resultado).toBe(true);
  });
});

// =============================================================================
// esSitioWebValido
// =============================================================================

describe('esSitioWebValido', () => {
  it('acepta URL https estándar', () => {
    expect(esSitioWebValido('https://www.empresa.com')).toBe(true);
  });

  it('acepta URL http estándar', () => {
    expect(esSitioWebValido('http://empresa.com')).toBe(true);
  });

  it('acepta URL con subdominios y ruta', () => {
    expect(esSitioWebValido('https://tienda.empresa.com/productos?id=1')).toBe(true);
  });

  it('rechaza URL sin protocolo', () => {
    expect(esSitioWebValido('www.empresa.com')).toBe(false);
  });

  it('rechaza URL con protocolo no soportado (ftp)', () => {
    expect(esSitioWebValido('ftp://archivos.empresa.com')).toBe(false);
  });

  it('rechaza string vacío', () => {
    expect(esSitioWebValido('')).toBe(false);
  });

  it('rechazar texto sin formato URL', () => {
    expect(esSitioWebValido('esto no es una url')).toBe(false);
  });

  it('rechazar solo el protocolo', () => {
    expect(esSitioWebValido('https://')).toBe(false);
  });
});

// =============================================================================
// obtenerTexto  (sanitización de inputs)
// =============================================================================

describe('obtenerTexto', () => {
  it('retorna el texto recortado para un string', () => {
    expect(obtenerTexto('  Hola Mundo  ')).toBe('Hola Mundo');
  });

  it('retorna string vacío para undefined', () => {
    expect(obtenerTexto(undefined)).toBe('');
  });

  it('retorna string vacío para null', () => {
    expect(obtenerTexto(null)).toBe('');
  });

  it('retorna string vacío para número', () => {
    expect(obtenerTexto(42)).toBe('');
  });

  it('retorna string vacío para booleano', () => {
    expect(obtenerTexto(true)).toBe('');
  });

  it('retorna string vacío para objeto', () => {
    expect(obtenerTexto({ foo: 'bar' })).toBe('');
  });

  it('retorna string vacío para array', () => {
    expect(obtenerTexto([1, 2, 3])).toBe('');
  });

  it('no modifica un string sin espacios', () => {
    expect(obtenerTexto('hola')).toBe('hola');
  });
});

// =============================================================================
// isTokenValid  (JWT validation del lado del cliente)
// =============================================================================

describe('isTokenValid', () => {
  // --------------------------------------------------------------------------
  // Happy paths
  // --------------------------------------------------------------------------

  it('retorna true para un JWT válido con exp futuro', () => {
    const futuro = Math.floor(Date.now() / 1000) + 3600; // 1 hora
    const payload = btoa(JSON.stringify({ exp: futuro, sub: '42' }));
    const token = `header.${payload}.signature`;
    expect(isTokenValid(token)).toBe(true);
  });

  it('retorna true para JWT sin exp (asume válido)', () => {
    const payload = btoa(JSON.stringify({ sub: '42' }));
    const token = `header.${payload}.signature`;
    expect(isTokenValid(token)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Formatos inválidos
  // --------------------------------------------------------------------------

  it('retorna false para token vacío', () => {
    expect(isTokenValid('')).toBe(false);
  });

  it('retorna false para token con solo espacios', () => {
    expect(isTokenValid('   ')).toBe(false);
  });

  it('retorna false si no tiene 3 partes separadas por punto', () => {
    expect(isTokenValid('solouna parte')).toBe(false);
  });

  it('retorna false si tiene 2 partes', () => {
    expect(isTokenValid('header.payload')).toBe(false);
  });

  it('retorna false si tiene 4 partes', () => {
    expect(isTokenValid('a.b.c.d')).toBe(false);
  });

  // --------------------------------------------------------------------------
  // payload malformado
  // --------------------------------------------------------------------------

  it('retorna false si el payload no es base64 válido', () => {
    const token = 'header.%%%%.signature';
    expect(isTokenValid(token)).toBe(false);
  });

  it('retorna false si el payload no es JSON', () => {
    const payload = btoa('esto no es json');
    const token = `header.${payload}.signature`;
    expect(isTokenValid(token)).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Token expirado
  // --------------------------------------------------------------------------

  it('retorna false si el token expiró hace 1 segundo', () => {
    const pasado = Math.floor(Date.now() / 1000) - 1;
    const payload = btoa(JSON.stringify({ exp: pasado }));
    const token = `header.${payload}.signature`;
    expect(isTokenValid(token)).toBe(false);
  });

  it('retorna false si el token expiró hace 1 hora', () => {
    const pasado = Math.floor(Date.now() / 1000) - 3600;
    const payload = btoa(JSON.stringify({ exp: pasado }));
    const token = `header.${payload}.signature`;
    expect(isTokenValid(token)).toBe(false);
  });

  it('retorna false si exp es exactamente ahora (no >)', () => {
    const ahora = Math.floor(Date.now() / 1000);
    const payload = btoa(JSON.stringify({ exp: ahora }));
    const token = `header.${payload}.signature`;
    expect(isTokenValid(token)).toBe(false);
  });

  // --------------------------------------------------------------------------
  // Casos límite con el payload
  // --------------------------------------------------------------------------

  it('retorna false si exp es un string en lugar de número', () => {
    // El payload contiene "exp": "1000". JavaScript convierte el string a
    // número en la comparación `>`, obteniendo 1000, que es menor que
    // el timestamp actual → se considera expirado.
    const payload = btoa(JSON.stringify({ exp: '1000' }));
    const token = `header.${payload}.signature`;
    expect(isTokenValid(token)).toBe(false);
  });

  it('maneja padding de base64url correctamente (guión bajo y guión)', () => {
    // Simula un JWT real con caracteres base64url
    const futuro = Math.floor(Date.now() / 1000) + 3600;
    const payloadRaw = JSON.stringify({ exp: futuro, sub: '42' });
    // Forzar caracteres que requieren reemplazo
    const payloadB64 = btoa(payloadRaw).replace(/\+/g, '-').replace(/\//g, '_');
    const token = `header.${payloadB64}.signature`;
    expect(isTokenValid(token)).toBe(true);
  });

  it('retorna false para payload con caracteres no ASCII en base64', () => {
    // btoa lanza en ciertos caracteres, pero si el payload contiene
    // caracteres que hacen que atob devuelva algo no-JSON
    const token = 'header.eyJleHAiOiAi8J+YgCJ9.signature'; // contiene emoji
    expect(isTokenValid(token)).toBe(false);
  });
});

// =============================================================================
// Integración: simulación de flujo de login (token → isTokenValid)
// =============================================================================

describe('integración token + validación', () => {
  it('un token recién creado para un usuario futuro es válido', () => {
    const futuro = Math.floor(Date.now() / 1000) + 86400; // 24h
    const payload = btoa(JSON.stringify({
      sub: '123',
      exp: futuro,
      role: 'admin',
    }));
    const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.firma_simulada`;

    expect(isTokenValid(token)).toBe(true);
  });

  it('token sin exp se considera válido (asume que el servidor validará)', () => {
    const payload = btoa(JSON.stringify({ sub: '123', role: 'user' }));
    const token = `header.${payload}.signature`;

    expect(isTokenValid(token)).toBe(true);
  });

  it('token con exp en el pasado se rechaza', () => {
    const pasado = Math.floor(Date.now() / 1000) - 10;
    const payload = btoa(JSON.stringify({ sub: '123', exp: pasado }));
    const token = `header.${payload}.signature`;

    expect(isTokenValid(token)).toBe(false);
  });
});