export const inventoryCategories = [
  'carne',
  'verduras',
  'salsas',
  'bebidas',
  'packaging',
  'productos de limpieza',
] as const

export type InventoryCategory = typeof inventoryCategories[number]

export const inventoryUnits = ['kg', 'g', 'l', 'ml', 'unidad'] as const

export type InventoryUnit = typeof inventoryUnits[number]

export const movementTypes = ['entrada', 'salida', 'ajuste'] as const

export type MovementType = typeof movementTypes[number]

export interface InventoryArticle {
  id: string
  nombre: string
  categoria: InventoryCategory
  unidad_medida: InventoryUnit
  punto_reorden: string
}

export interface InventoryLocation {
  id: string
  nombre: string
}

export interface InventoryMovement {
  id: string
  articulo_id: string
  local: string
  tipo: MovementType
  cantidad: string
  autor: string
  fecha: string
  motivo?: string | null
}

export interface InventoryStock {
  articulo_id: string
  local: string
  stock: string
  unidad_medida: InventoryUnit
  punto_reorden: string
  bajo_punto_reorden: boolean
}

export interface NewInventoryArticle {
  nombre: string
  categoria: InventoryCategory
  unidad_medida: InventoryUnit
  punto_reorden: string
}

export interface NewInventoryLocation {
  nombre: string
}

export interface NewInventoryMovement {
  articulo_id: string
  local: string
  tipo: MovementType
  cantidad: string
  autor: string
  fecha: string
  motivo?: string | null
}

export interface InventoryMovementFilters {
  articulo_id?: string
  local?: string
}
