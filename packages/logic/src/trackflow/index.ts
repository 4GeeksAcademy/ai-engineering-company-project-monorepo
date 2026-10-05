/**
 * TrackFlow - Punto de Entrada de Utilidades
 * Hito 2: Fundamentos de Programación
 * 
 * Exporta todas las funciones de utilidades de un solo lugar
 * para facilitar importaciones desde el resto de la aplicación.
 */

// Tipos
export * from "./contracts";

// Colecciones
export * from "./collections";

// Búsqueda
export * from "./search";

// Transformaciones y Reportes
export * from "./transformations";

// Validaciones
export * from "./validations";

// Script de pruebas de fuego reutilizable
export * from "./smokeReport";

// Cliente API de Talento Humano
export { createTalentApiClient, talentApi } from "./talentApi";

