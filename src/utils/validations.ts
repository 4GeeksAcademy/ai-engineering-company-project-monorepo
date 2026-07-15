// ============================================================
// validations.ts — Brasaland · Validaciones de negocio
// Funciones puras que verifican reglas de negocio antes de
// procesar o almacenar entidades del sistema Brasaland.
// ============================================================

import type {
  Local,
  Ingrediente,
  OrdenCompra,
  Empleado,
  Cliente,
  Proveedor,
  VentaDiaria,
  Receta,
  MovimientoInventario,
  InventarioLocal,
  ResultadoValidacion,
} from "../types/models";

// ────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ────────────────────────────────────────────────────────────

/** Verifica si una cadena de texto no está vacía */
function noEstaVacio(valor: string): boolean {
  return valor.trim().length > 0;
}

/** Verifica formato de email básico */
function esEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Verifica formato de fecha ISO 8601 (YYYY-MM-DD) */
function esFechaISOValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const date = new Date(fecha);
  return !isNaN(date.getTime());
}

/** Verifica que una fecha no sea futura */
function noEsFechaFutura(fecha: string): boolean {
  const hoy = new Date().toISOString().split("T")[0];
  return fecha <= hoy;
}

/** Verifica que fecha1 sea anterior o igual a fecha2 */
function fechaAntesOIgualQue(fecha1: string, fecha2: string): boolean {
  return fecha1 <= fecha2;
}

// ────────────────────────────────────────────────────────────
// VALIDACIÓN: LOCAL
// ────────────────────────────────────────────────────────────

/**
 * Valida que un local tenga todos los campos obligatorios y
 * cumpla las reglas de negocio de Brasaland.
 */
export function validarLocal(local: Local): ResultadoValidacion {
  const errores: string[] = [];

  if (!noEstaVacio(local.id)) errores.push("El ID del local es obligatorio.");
  if (!noEstaVacio(local.nombre))
    errores.push("El nombre del local es obligatorio.");
  if (!noEstaVacio(local.ciudad))
    errores.push("La ciudad del local es obligatoria.");
  if (!noEstaVacio(local.direccion))
    errores.push("La dirección del local es obligatoria.");
  if (!noEstaVacio(local.telefono))
    errores.push("El teléfono del local es obligatorio.");
  if (!noEstaVacio(local.supervisorId))
    errores.push("El supervisor asignado es obligatorio.");

  if (!["Colombia", "USA"].includes(local.pais))
    errores.push("El país debe ser 'Colombia' o 'USA'.");

  if (!["COP", "USD"].includes(local.monedaLocal)) {
    errores.push("La moneda del local debe ser 'COP' o 'USD'.");
  } else {
    // Coherencia: Colombia usa COP, USA usa USD
    if (local.pais === "Colombia" && local.monedaLocal !== "COP")
      errores.push("Los locales en Colombia deben usar COP.");
    if (local.pais === "USA" && local.monedaLocal !== "USD")
      errores.push("Los locales en USA deben usar USD.");
  }

  if (!esFechaISOValida(local.fechaApertura))
    errores.push("La fecha de apertura debe tener formato YYYY-MM-DD.");
  else if (!noEsFechaFutura(local.fechaApertura))
    errores.push("La fecha de apertura no puede ser futura.");

  return { valido: errores.length === 0, errores };
}

// ────────────────────────────────────────────────────────────
// VALIDACIÓN: INGREDIENTE
// ────────────────────────────────────────────────────────────

export function validarIngrediente(
  ingrediente: Ingrediente
): ResultadoValidacion {
  const errores: string[] = [];

  if (!noEstaVacio(ingrediente.id))
    errores.push("El ID del ingrediente es obligatorio.");
  if (!noEstaVacio(ingrediente.nombre))
    errores.push("El nombre del ingrediente es obligatorio.");
  if (!noEstaVacio(ingrediente.unidadMedida))
    errores.push("La unidad de medida es obligatoria.");

  const categoriasValidas = [
    "carne",
    "verdura",
    "salsa",
    "bebida",
    "empaque",
    "limpieza",
  ];
  if (!categoriasValidas.includes(ingrediente.categoria))
    errores.push(`La categoría '${ingrediente.categoria}' no es válida.`);

  if (ingrediente.stockMinimo < 0)
    errores.push("El stock mínimo no puede ser negativo.");
  if (ingrediente.stockMinimo === 0)
    errores.push(
      "El stock mínimo debe ser mayor a 0 para generar alertas correctamente."
    );

  return { valido: errores.length === 0, errores };
}

// ────────────────────────────────────────────────────────────
// VALIDACIÓN: INVENTARIO LOCAL
// ────────────────────────────────────────────────────────────

export function validarInventarioLocal(
  inventario: InventarioLocal
): ResultadoValidacion {
  const errores: string[] = [];

  if (!noEstaVacio(inventario.localId))
    errores.push("El ID del local es obligatorio.");
  if (!noEstaVacio(inventario.ingredienteId))
    errores.push("El ID del ingrediente es obligatorio.");

  if (inventario.cantidadActual < 0)
    errores.push("La cantidad en inventario no puede ser negativa.");

  if (!esFechaISOValida(inventario.fechaUltimaActualizacion))
    errores.push(
      "La fecha de última actualización debe tener formato YYYY-MM-DD."
    );

  return { valido: errores.length === 0, errores };
}

// ────────────────────────────────────────────────────────────
// VALIDACIÓN: MOVIMIENTO DE INVENTARIO
// ────────────────────────────────────────────────────────────

export function validarMovimientoInventario(
  movimiento: MovimientoInventario
): ResultadoValidacion {
  const errores: string[] = [];

  if (!noEstaVacio(movimiento.id))
    errores.push("El ID del movimiento es obligatorio.");
  if (!noEstaVacio(movimiento.localId))
    errores.push("El ID del local es obligatorio.");
  if (!noEstaVacio(movimiento.ingredienteId))
    errores.push("El ID del ingrediente es obligatorio.");
  if (!noEstaVacio(movimiento.motivo))
    errores.push("El motivo del movimiento es obligatorio.");

  const tiposValidos = ["entrada", "salida", "ajuste"];
  if (!tiposValidos.includes(movimiento.tipo))
    errores.push(`El tipo '${movimiento.tipo}' no es válido.`);

  if (movimiento.cantidad <= 0)
    errores.push("La cantidad del movimiento debe ser mayor a 0.");

  if (!esFechaISOValida(movimiento.fecha))
    errores.push("La fecha del movimiento debe tener formato YYYY-MM-DD.");

  return { valido: errores.length === 0, errores };
}

// ────────────────────────────────────────────────────────────
// VALIDACIÓN: RECETA
// ────────────────────────────────────────────────────────────

export function validarReceta(receta: Receta): ResultadoValidacion {
  const errores: string[] = [];

  if (!noEstaVacio(receta.id))
    errores.push("El ID de la receta es obligatorio.");
  if (!noEstaVacio(receta.nombrePlatillo))
    errores.push("El nombre del platillo es obligatorio.");

  if (receta.componentes.length === 0)
    errores.push("La receta debe tener al menos un componente (ingrediente).");

  receta.componentes.forEach((comp, idx) => {
    if (!noEstaVacio(comp.ingredienteId))
      errores.push(
        `El componente en posición ${idx + 1} no tiene ingredienteId.`
      );
    if (comp.cantidad <= 0)
      errores.push(
        `La cantidad del componente ${idx + 1} debe ser mayor a 0.`
      );
  });

  if (receta.tiempoPreparacionMinutos <= 0)
    errores.push("El tiempo de preparación debe ser mayor a 0 minutos.");
  if (receta.tiempoPreparacionMinutos > 120)
    errores.push(
      "El tiempo de preparación no puede superar 120 minutos (política Brasaland)."
    );

  if (receta.precioBase <= 0)
    errores.push("El precio base debe ser mayor a 0.");
  if (receta.precioBase > 100)
    errores.push(
      "El precio base en USD no puede superar $100 (política de precios Brasaland)."
    );

  return { valido: errores.length === 0, errores };
}

// ────────────────────────────────────────────────────────────
// VALIDACIÓN: PROVEEDOR
// ────────────────────────────────────────────────────────────

export function validarProveedor(proveedor: Proveedor): ResultadoValidacion {
  const errores: string[] = [];

  if (!noEstaVacio(proveedor.id))
    errores.push("El ID del proveedor es obligatorio.");
  if (!noEstaVacio(proveedor.nombre))
    errores.push("El nombre del proveedor es obligatorio.");
  if (!noEstaVacio(proveedor.contactoNombre))
    errores.push("El nombre de contacto es obligatorio.");

  if (!esEmailValido(proveedor.contactoEmail))
    errores.push("El email del proveedor no tiene un formato válido.");

  if (!noEstaVacio(proveedor.contactoTelefono))
    errores.push("El teléfono de contacto es obligatorio.");

  if (!["Colombia", "USA"].includes(proveedor.pais))
    errores.push("El país del proveedor debe ser 'Colombia' o 'USA'.");

  if (proveedor.categoriasQueProvee.length === 0)
    errores.push("El proveedor debe ofrecer al menos una categoría.");

  if (proveedor.tiempoEntregaDias < 1)
    errores.push("El tiempo de entrega debe ser al menos 1 día.");
  if (proveedor.tiempoEntregaDias > 30)
    errores.push(
      "El tiempo de entrega no puede superar 30 días (política Brasaland)."
    );

  if (proveedor.montoMinimoOrden < 0)
    errores.push("El monto mínimo de orden no puede ser negativo.");

  if (!["COP", "USD"].includes(proveedor.moneda))
    errores.push("La moneda del proveedor debe ser 'COP' o 'USD'.");

  return { valido: errores.length === 0, errores };
}

// ────────────────────────────────────────────────────────────
// VALIDACIÓN: ORDEN DE COMPRA
// ────────────────────────────────────────────────────────────

export function validarOrdenCompra(orden: OrdenCompra): ResultadoValidacion {
  const errores: string[] = [];

  if (!noEstaVacio(orden.id))
    errores.push("El ID de la orden es obligatorio.");
  if (!noEstaVacio(orden.localId))
    errores.push("El ID del local es obligatorio.");
  if (!noEstaVacio(orden.proveedorId))
    errores.push("El ID del proveedor es obligatorio.");

  const estadosValidos = [
    "pendiente",
    "aprobada",
    "enviada",
    "recibida",
    "cancelada",
  ];
  if (!estadosValidos.includes(orden.estado))
    errores.push(`El estado '${orden.estado}' no es válido.`);

  if (orden.lineas.length === 0)
    errores.push("La orden debe tener al menos una línea de pedido.");

  orden.lineas.forEach((linea, idx) => {
    if (!noEstaVacio(linea.ingredienteId))
      errores.push(`La línea ${idx + 1} no tiene ingredienteId.`);
    if (linea.cantidadSolicitada <= 0)
      errores.push(
        `La cantidad en la línea ${idx + 1} debe ser mayor a 0.`
      );
    if (linea.precioUnitario <= 0)
      errores.push(
        `El precio unitario en la línea ${idx + 1} debe ser mayor a 0.`
      );
    const subtotalEsperado =
      Math.round(linea.cantidadSolicitada * linea.precioUnitario * 100) / 100;
    if (Math.abs(linea.subtotal - subtotalEsperado) > 0.01)
      errores.push(
        `El subtotal de la línea ${idx + 1} no coincide con cantidad × precioUnitario.`
      );
  });

  const totalEsperado =
    Math.round(
      orden.lineas.reduce((acc, l) => acc + l.subtotal, 0) * 100
    ) / 100;
  if (Math.abs(orden.totalOrden - totalEsperado) > 0.01)
    errores.push("El total de la orden no coincide con la suma de subtotales.");

  if (!esFechaISOValida(orden.fechaCreacion))
    errores.push("La fecha de creación debe tener formato YYYY-MM-DD.");

  // Si está aprobada, debe tener fecha de aprobación y aprobador
  if (orden.estado === "aprobada" || orden.estado === "enviada") {
    if (!orden.fechaAprobacion)
      errores.push(
        "Una orden aprobada o enviada debe tener fecha de aprobación."
      );
    if (!orden.aprobadoPor)
      errores.push(
        "Una orden aprobada o enviada debe registrar quién la aprobó."
      );
    if (
      orden.fechaAprobacion &&
      orden.fechaAprobacion < orden.fechaCreacion
    )
      errores.push(
        "La fecha de aprobación no puede ser anterior a la fecha de creación."
      );
  }

  if (!["COP", "USD"].includes(orden.moneda))
    errores.push("La moneda de la orden debe ser 'COP' o 'USD'.");

  return { valido: errores.length === 0, errores };
}

// ────────────────────────────────────────────────────────────
// VALIDACIÓN: VENTA DIARIA
// ────────────────────────────────────────────────────────────

export function validarVentaDiaria(venta: VentaDiaria): ResultadoValidacion {
  const errores: string[] = [];

  if (!noEstaVacio(venta.id)) errores.push("El ID de la venta es obligatorio.");
  if (!noEstaVacio(venta.localId))
    errores.push("El ID del local es obligatorio.");

  if (!esFechaISOValida(venta.fecha))
    errores.push("La fecha de la venta debe tener formato YYYY-MM-DD.");
  else if (!noEsFechaFutura(venta.fecha))
    errores.push("No se puede registrar una venta con fecha futura.");

  if (venta.lineas.length === 0)
    errores.push("La venta debe tener al menos una línea.");

  venta.lineas.forEach((linea, idx) => {
    if (!noEstaVacio(linea.recetaId))
      errores.push(`La línea ${idx + 1} no tiene recetaId.`);
    if (linea.cantidad <= 0)
      errores.push(`La cantidad en la línea ${idx + 1} debe ser mayor a 0.`);
    if (linea.precioUnitario <= 0)
      errores.push(
        `El precio unitario en la línea ${idx + 1} debe ser mayor a 0.`
      );
    const subtotalEsperado =
      Math.round(linea.cantidad * linea.precioUnitario * 100) / 100;
    if (Math.abs(linea.subtotal - subtotalEsperado) > 0.01)
      errores.push(
        `El subtotal de la línea ${idx + 1} no coincide con cantidad × precioUnitario.`
      );
  });

  const totalEsperado =
    Math.round(
      venta.lineas.reduce((acc, l) => acc + l.subtotal, 0) * 100
    ) / 100;
  if (Math.abs(venta.totalVenta - totalEsperado) > 0.01)
    errores.push("El total de la venta no coincide con la suma de subtotales.");

  if (venta.totalCovers <= 0)
    errores.push("El número de covers debe ser mayor a 0.");
  if (venta.totalCovers > 500)
    errores.push(
      "El número de covers supera el límite operativo de 500 por día."
    );

  if (!["COP", "USD"].includes(venta.moneda))
    errores.push("La moneda de la venta debe ser 'COP' o 'USD'.");

  return { valido: errores.length === 0, errores };
}

// ────────────────────────────────────────────────────────────
// VALIDACIÓN: EMPLEADO
// ────────────────────────────────────────────────────────────

export function validarEmpleado(empleado: Empleado): ResultadoValidacion {
  const errores: string[] = [];

  if (!noEstaVacio(empleado.id))
    errores.push("El ID del empleado es obligatorio.");
  if (!noEstaVacio(empleado.nombre))
    errores.push("El nombre del empleado es obligatorio.");
  if (!noEstaVacio(empleado.apellido))
    errores.push("El apellido del empleado es obligatorio.");

  if (!esEmailValido(empleado.email))
    errores.push("El email del empleado no tiene un formato válido.");

  if (!noEstaVacio(empleado.localId))
    errores.push("El local asignado es obligatorio.");

  const rolesValidos = [
    "cocinero",
    "mesero",
    "cajero",
    "supervisor",
    "gerente_local",
    "administrador",
  ];
  if (!rolesValidos.includes(empleado.rol))
    errores.push(`El rol '${empleado.rol}' no es válido.`);

  const estadosValidos = ["activo", "inactivo", "en_vacaciones"];
  if (!estadosValidos.includes(empleado.estado))
    errores.push(`El estado '${empleado.estado}' no es válido.`);

  if (!["Colombia", "USA"].includes(empleado.pais))
    errores.push("El país del empleado debe ser 'Colombia' o 'USA'.");

  if (!esFechaISOValida(empleado.fechaIngreso))
    errores.push("La fecha de ingreso debe tener formato YYYY-MM-DD.");
  else if (!noEsFechaFutura(empleado.fechaIngreso))
    errores.push("La fecha de ingreso no puede ser futura.");

  if (empleado.salario <= 0)
    errores.push("El salario debe ser mayor a 0.");

  // Rango salarial mínimo por país (valores de referencia)
  if (empleado.pais === "Colombia" && empleado.salario < 1_300_000)
    errores.push(
      "El salario en Colombia no puede ser menor al salario mínimo (COP 1,300,000)."
    );
  if (empleado.pais === "USA" && empleado.salario < 1_800)
    errores.push(
      "El salario mensual en USA no puede ser menor a USD 1,800 (referencia Florida)."
    );

  if (!["COP", "USD"].includes(empleado.monedaSalario))
    errores.push("La moneda del salario debe ser 'COP' o 'USD'.");

  // Coherencia país-moneda
  if (empleado.pais === "Colombia" && empleado.monedaSalario !== "COP")
    errores.push("Empleados en Colombia deben recibir salario en COP.");
  if (empleado.pais === "USA" && empleado.monedaSalario !== "USD")
    errores.push("Empleados en USA deben recibir salario en USD.");

  return { valido: errores.length === 0, errores };
}

// ────────────────────────────────────────────────────────────
// VALIDACIÓN: CLIENTE (BRASA POINTS)
// ────────────────────────────────────────────────────────────

export function validarCliente(cliente: Cliente): ResultadoValidacion {
  const errores: string[] = [];

  if (!noEstaVacio(cliente.id))
    errores.push("El ID del cliente es obligatorio.");
  if (!noEstaVacio(cliente.nombre))
    errores.push("El nombre del cliente es obligatorio.");
  if (!noEstaVacio(cliente.apellido))
    errores.push("El apellido del cliente es obligatorio.");

  if (!esEmailValido(cliente.email))
    errores.push("El email del cliente no tiene un formato válido.");

  if (!noEstaVacio(cliente.telefono))
    errores.push("El teléfono del cliente es obligatorio.");

  if (cliente.brasaPoints < 0)
    errores.push("Los Brasa Points no pueden ser negativos.");

  if (!noEstaVacio(cliente.localFrecuente))
    errores.push("El local frecuente del cliente es obligatorio.");

  if (!esFechaISOValida(cliente.fechaRegistro))
    errores.push("La fecha de registro debe tener formato YYYY-MM-DD.");
  else if (!noEsFechaFutura(cliente.fechaRegistro))
    errores.push("La fecha de registro no puede ser futura.");

  if (!esFechaISOValida(cliente.ultimaVisita))
    errores.push("La fecha de última visita debe tener formato YYYY-MM-DD.");
  else if (!noEsFechaFutura(cliente.ultimaVisita))
    errores.push("La última visita no puede ser futura.");

  if (
    esFechaISOValida(cliente.fechaRegistro) &&
    esFechaISOValida(cliente.ultimaVisita) &&
    cliente.ultimaVisita < cliente.fechaRegistro
  )
    errores.push(
      "La última visita no puede ser anterior a la fecha de registro."
    );

  if (cliente.totalGastado < 0)
    errores.push("El gasto total histórico no puede ser negativo.");

  return { valido: errores.length === 0, errores };
}
