// ============================================================
// demo.ts — Brasaland · Datos de muestra y demostración
// Ejecutar con: npx tsx src/demo.ts
// ============================================================

import type {
  Local,
  Ingrediente,
  InventarioLocal,
  Receta,
  Proveedor,
  OrdenCompra,
  VentaDiaria,
  Empleado,
  Cliente,
} from "./types/models";

// ── Colecciones ──────────────────────────────────────────────
import {
  filtrarLocalesPorPais,
  filtrarLocalesActivos,
  filtrarIngredientesPorCategoria,
  filtrarOrdenesPorEstado,
  filtrarVentasPorRangoFechas,
  filtrarEmpleadosPorRol,
  filtrarClientesInactivosPorDias,
  ordenarLocalesPorNombre,
  ordenarVentasPorTotal,
  filtrarProveedoresPorCategoria,
} from "./utils/collections";

// ── Búsquedas ────────────────────────────────────────────────
import {
  buscarLocalPorId,
  buscarIngredientePorId,
  buscarEmpleadoPorEmail,
  buscarClientePorEmail,
  buscarLocalPorIdBinario,
  buscarIngredientePorIdBinario,
  buscarVentaPorFechaBinario,
} from "./utils/search";

// ── Transformaciones ─────────────────────────────────────────
import {
  contarLocalesPorPais,
  contarEmpleadosPorRol,
  sumarTotalVentas,
  sumarVentasPorLocal,
  calcularTicketPromedio,
  calcularPromedioBrasaPoints,
  encontrarVentaMaxima,
  encontrarClienteConMasPuntos,
  obtenerPlatilloMasVendido,
  generarAlertasStockCritico,
  generarReporteVentasLocal,
  generarReporteConsolidado,
  generarResumenClientes,
} from "./utils/transformations";

// ── Validaciones ─────────────────────────────────────────────
import {
  validarLocal,
  validarIngrediente,
  validarOrdenCompra,
  validarVentaDiaria,
  validarEmpleado,
  validarCliente,
  validarReceta,
  validarProveedor,
} from "./utils/validations";

// ============================================================
// DATOS DE MUESTRA
// ============================================================

const locales: Local[] = [
  {
    id: "MED-001",
    nombre: "Brasaland El Poblado",
    ciudad: "Medellín",
    pais: "Colombia",
    monedaLocal: "COP",
    direccion: "Calle 10 # 43D-45, El Poblado",
    telefono: "+57 4 3101234",
    supervisorId: "EMP-SUP-001",
    activo: true,
    fechaApertura: "2015-03-10",
  },
  {
    id: "MED-002",
    nombre: "Brasaland Centro",
    ciudad: "Medellín",
    pais: "Colombia",
    monedaLocal: "COP",
    direccion: "Carrera 52 # 45-20, Centro",
    telefono: "+57 4 3112345",
    supervisorId: "EMP-SUP-001",
    activo: true,
    fechaApertura: "2017-07-22",
  },
  {
    id: "BOG-001",
    nombre: "Brasaland Chapinero",
    ciudad: "Bogotá",
    pais: "Colombia",
    monedaLocal: "COP",
    direccion: "Cra 7 # 52-10, Chapinero",
    telefono: "+57 1 7891234",
    supervisorId: "EMP-SUP-002",
    activo: true,
    fechaApertura: "2019-01-15",
  },
  {
    id: "MIA-001",
    nombre: "Brasaland Miami Downtown",
    ciudad: "Miami",
    pais: "USA",
    monedaLocal: "USD",
    direccion: "100 Brickell Ave, Miami FL 33131",
    telefono: "+1 305 5551234",
    supervisorId: "EMP-SUP-003",
    activo: true,
    fechaApertura: "2021-06-01",
  },
  {
    id: "ORL-001",
    nombre: "Brasaland Orlando",
    ciudad: "Orlando",
    pais: "USA",
    monedaLocal: "USD",
    direccion: "8400 International Dr, Orlando FL 32819",
    telefono: "+1 407 5559876",
    supervisorId: "EMP-SUP-003",
    activo: false,
    fechaApertura: "2022-11-10",
  },
];

const ingredientes: Ingrediente[] = [
  {
    id: "ING-001",
    nombre: "Carne de Res (kg)",
    categoria: "carne",
    unidadMedida: "kg",
    stockMinimo: 20,
    perecedero: true,
  },
  {
    id: "ING-002",
    nombre: "Pollo Entero (kg)",
    categoria: "carne",
    unidadMedida: "kg",
    stockMinimo: 15,
    perecedero: true,
  },
  {
    id: "ING-003",
    nombre: "Tomate (kg)",
    categoria: "verdura",
    unidadMedida: "kg",
    stockMinimo: 10,
    perecedero: true,
  },
  {
    id: "ING-004",
    nombre: "Lechuga (unidad)",
    categoria: "verdura",
    unidadMedida: "unidades",
    stockMinimo: 30,
    perecedero: true,
  },
  {
    id: "ING-005",
    nombre: "Salsa Chimichurri (litros)",
    categoria: "salsa",
    unidadMedida: "litros",
    stockMinimo: 5,
    perecedero: false,
  },
  {
    id: "ING-006",
    nombre: "Gaseosa Cola (litros)",
    categoria: "bebida",
    unidadMedida: "litros",
    stockMinimo: 50,
    perecedero: false,
  },
  {
    id: "ING-007",
    nombre: "Caja de Empaque",
    categoria: "empaque",
    unidadMedida: "unidades",
    stockMinimo: 200,
    perecedero: false,
  },
];

const inventarios: InventarioLocal[] = [
  {
    localId: "MED-001",
    ingredienteId: "ING-001",
    cantidadActual: 8,     // ← BAJO stock (mínimo 20)
    fechaUltimaActualizacion: "2024-06-20",
  },
  {
    localId: "MED-001",
    ingredienteId: "ING-002",
    cantidadActual: 25,
    fechaUltimaActualizacion: "2024-06-20",
  },
  {
    localId: "MED-001",
    ingredienteId: "ING-003",
    cantidadActual: 3,     // ← BAJO stock (mínimo 10)
    fechaUltimaActualizacion: "2024-06-20",
  },
  {
    localId: "MIA-001",
    ingredienteId: "ING-001",
    cantidadActual: 45,
    fechaUltimaActualizacion: "2024-06-21",
  },
  {
    localId: "MIA-001",
    ingredienteId: "ING-006",
    cantidadActual: 10,    // ← BAJO stock (mínimo 50)
    fechaUltimaActualizacion: "2024-06-21",
  },
];

const recetas: Receta[] = [
  {
    id: "REC-001",
    nombrePlatillo: "Bandeja Brasaland",
    descripcion: "Combinación de carnes a las brasas con acompañamientos.",
    componentes: [
      { ingredienteId: "ING-001", cantidad: 0.3 },
      { ingredienteId: "ING-002", cantidad: 0.2 },
      { ingredienteId: "ING-003", cantidad: 0.1 },
    ],
    tiempoPreparacionMinutos: 25,
    precioBase: 14.99,
    disponible: true,
  },
  {
    id: "REC-002",
    nombrePlatillo: "Pollo a la Brasa",
    descripcion: "Pollo entero marinado y asado a las brasas.",
    componentes: [
      { ingredienteId: "ING-002", cantidad: 0.5 },
      { ingredienteId: "ING-005", cantidad: 0.05 },
    ],
    tiempoPreparacionMinutos: 40,
    precioBase: 12.5,
    disponible: true,
  },
  {
    id: "REC-003",
    nombrePlatillo: "Hamburguesa Brasaland",
    descripcion: "Hamburguesa artesanal con carne de res premium.",
    componentes: [
      { ingredienteId: "ING-001", cantidad: 0.2 },
      { ingredienteId: "ING-003", cantidad: 0.05 },
      { ingredienteId: "ING-004", cantidad: 0.1 },
    ],
    tiempoPreparacionMinutos: 15,
    precioBase: 9.99,
    disponible: true,
  },
];

const proveedores: Proveedor[] = [
  {
    id: "PROV-001",
    nombre: "Carnes Premium Colombia S.A.S.",
    pais: "Colombia",
    contactoNombre: "Andrés Mora",
    contactoEmail: "andres.mora@carnespremium.co",
    contactoTelefono: "+57 310 1234567",
    categoriasQueProvee: ["carne"],
    tiempoEntregaDias: 2,
    montoMinimoOrden: 500_000,
    moneda: "COP",
    activo: true,
  },
  {
    id: "PROV-002",
    nombre: "Florida Meat Distributors LLC",
    pais: "USA",
    contactoNombre: "James Walker",
    contactoEmail: "j.walker@floridameat.com",
    contactoTelefono: "+1 305 5550001",
    categoriasQueProvee: ["carne", "verdura"],
    tiempoEntregaDias: 1,
    montoMinimoOrden: 300,
    moneda: "USD",
    activo: true,
  },
  {
    id: "PROV-003",
    nombre: "Verduras del Campo Ltda.",
    pais: "Colombia",
    contactoNombre: "Liliana Ríos",
    contactoEmail: "liliana.rios@verdurascampo.co",
    contactoTelefono: "+57 4 6789012",
    categoriasQueProvee: ["verdura", "salsa"],
    tiempoEntregaDias: 1,
    montoMinimoOrden: 200_000,
    moneda: "COP",
    activo: true,
  },
];

const ordenes: OrdenCompra[] = [
  {
    id: "OC-2024-001",
    localId: "MED-001",
    proveedorId: "PROV-001",
    estado: "aprobada",
    lineas: [
      {
        ingredienteId: "ING-001",
        cantidadSolicitada: 50,
        precioUnitario: 28_000,
        subtotal: 1_400_000,
      },
    ],
    totalOrden: 1_400_000,
    moneda: "COP",
    fechaCreacion: "2024-06-18",
    fechaAprobacion: "2024-06-18",
    fechaEntregaEstimada: "2024-06-20",
    aprobadoPor: "EMP-SUP-001",
    notas: "Urgente — stock bajo.",
  },
  {
    id: "OC-2024-002",
    localId: "MIA-001",
    proveedorId: "PROV-002",
    estado: "pendiente",
    lineas: [
      {
        ingredienteId: "ING-001",
        cantidadSolicitada: 30,
        precioUnitario: 8.5,
        subtotal: 255,
      },
      {
        ingredienteId: "ING-006",
        cantidadSolicitada: 100,
        precioUnitario: 1.2,
        subtotal: 120,
      },
    ],
    totalOrden: 375,
    moneda: "USD",
    fechaCreacion: "2024-06-21",
    fechaAprobacion: null,
    fechaEntregaEstimada: null,
    aprobadoPor: null,
    notas: "",
  },
];

const ventas: VentaDiaria[] = [
  {
    id: "VTA-2024-001",
    localId: "MED-001",
    fecha: "2024-06-17",
    lineas: [
      { recetaId: "REC-001", cantidad: 40, precioUnitario: 56_000, subtotal: 2_240_000 },
      { recetaId: "REC-002", cantidad: 25, precioUnitario: 47_000, subtotal: 1_175_000 },
      { recetaId: "REC-003", cantidad: 60, precioUnitario: 38_000, subtotal: 2_280_000 },
    ],
    totalVenta: 5_695_000,
    moneda: "COP",
    totalCovers: 120,
  },
  {
    id: "VTA-2024-002",
    localId: "MED-001",
    fecha: "2024-06-18",
    lineas: [
      { recetaId: "REC-001", cantidad: 55, precioUnitario: 56_000, subtotal: 3_080_000 },
      { recetaId: "REC-003", cantidad: 80, precioUnitario: 38_000, subtotal: 3_040_000 },
    ],
    totalVenta: 6_120_000,
    moneda: "COP",
    totalCovers: 145,
  },
  {
    id: "VTA-2024-003",
    localId: "MIA-001",
    fecha: "2024-06-17",
    lineas: [
      { recetaId: "REC-001", cantidad: 30, precioUnitario: 14.99, subtotal: 449.7 },
      { recetaId: "REC-002", cantidad: 20, precioUnitario: 12.5, subtotal: 250 },
    ],
    totalVenta: 699.7,
    moneda: "USD",
    totalCovers: 48,
  },
  {
    id: "VTA-2024-004",
    localId: "MIA-001",
    fecha: "2024-06-18",
    lineas: [
      { recetaId: "REC-003", cantidad: 45, precioUnitario: 9.99, subtotal: 449.55 },
      { recetaId: "REC-001", cantidad: 20, precioUnitario: 14.99, subtotal: 299.8 },
    ],
    totalVenta: 749.35,
    moneda: "USD",
    totalCovers: 62,
  },
];

const empleados: Empleado[] = [
  {
    id: "EMP-001",
    nombre: "Carlos",
    apellido: "Restrepo",
    email: "carlos.restrepo@brasaland.co",
    rol: "cocinero",
    localId: "MED-001",
    pais: "Colombia",
    fechaIngreso: "2020-03-01",
    salario: 1_500_000,
    monedaSalario: "COP",
    estado: "activo",
  },
  {
    id: "EMP-002",
    nombre: "Diana",
    apellido: "López",
    email: "diana.lopez@brasaland.co",
    rol: "mesero",
    localId: "MED-001",
    pais: "Colombia",
    fechaIngreso: "2021-08-15",
    salario: 1_400_000,
    monedaSalario: "COP",
    estado: "activo",
  },
  {
    id: "EMP-SUP-001",
    nombre: "Felipe",
    apellido: "Guerrero",
    email: "f.guerrero@brasaland.co",
    rol: "supervisor",
    localId: "MED-001",
    pais: "Colombia",
    fechaIngreso: "2015-01-10",
    salario: 4_500_000,
    monedaSalario: "COP",
    estado: "activo",
  },
  {
    id: "EMP-SUP-003",
    nombre: "Ashley",
    apellido: "Turner",
    email: "a.turner@brasaland.com",
    rol: "gerente_local",
    localId: "MIA-001",
    pais: "USA",
    fechaIngreso: "2021-05-20",
    salario: 5_000,
    monedaSalario: "USD",
    estado: "activo",
  },
];

const clientes: Cliente[] = [
  {
    id: "CLI-001",
    nombre: "Sofía",
    apellido: "Martínez",
    email: "sofia.martinez@gmail.com",
    telefono: "+57 311 2223344",
    brasaPoints: 1_200,
    localFrecuente: "MED-001",
    fechaRegistro: "2022-04-10",
    ultimaVisita: "2024-06-15",
    totalGastado: 380.5,
    activo: true,
  },
  {
    id: "CLI-002",
    nombre: "Miguel",
    apellido: "Torres",
    email: "miguel.torres@hotmail.com",
    telefono: "+57 312 9876543",
    brasaPoints: 350,
    localFrecuente: "BOG-001",
    fechaRegistro: "2023-01-20",
    ultimaVisita: "2024-05-30",
    totalGastado: 95.0,
    activo: true,
  },
  {
    id: "CLI-003",
    nombre: "Jennifer",
    apellido: "Smith",
    email: "j.smith@outlook.com",
    telefono: "+1 305 4443322",
    brasaPoints: 2_800,
    localFrecuente: "MIA-001",
    fechaRegistro: "2021-08-05",
    ultimaVisita: "2024-06-20",
    totalGastado: 920.75,
    activo: true,
  },
  {
    id: "CLI-004",
    nombre: "Ramón",
    apellido: "Díaz",
    email: "ramon.diaz@yahoo.com",
    telefono: "+57 315 6677889",
    brasaPoints: 50,
    localFrecuente: "MED-002",
    fechaRegistro: "2023-11-01",
    ultimaVisita: "2024-01-10",  // ← más de 10 días sin visita
    totalGastado: 22.0,
    activo: true,
  },
];

// ============================================================
// UTILIDADES DE IMPRESIÓN
// ============================================================

function separador(titulo: string): void {
  console.log("\n" + "═".repeat(60));
  console.log(`  ${titulo}`);
  console.log("═".repeat(60));
}

function sub(subtitulo: string): void {
  console.log(`\n  ── ${subtitulo}`);
}

// ============================================================
// DEMOSTRACIÓN
// ============================================================

separador("1. FILTRADO DE COLECCIONES");

sub("Locales en Colombia:");
console.log(filtrarLocalesPorPais(locales, "Colombia").map((l) => l.nombre));

sub("Locales activos:");
console.log(filtrarLocalesActivos(locales).map((l) => l.nombre));

sub("Locales ordenados A→Z:");
console.log(ordenarLocalesPorNombre(locales).map((l) => l.nombre));

sub("Ingredientes de categoría 'carne':");
console.log(
  filtrarIngredientesPorCategoria(ingredientes, "carne").map((i) => i.nombre)
);

sub("Proveedores que proveen 'carne':");
console.log(
  filtrarProveedoresPorCategoria(proveedores, "carne").map((p) => p.nombre)
);

sub("Órdenes pendientes:");
console.log(filtrarOrdenesPorEstado(ordenes, "pendiente").map((o) => o.id));

sub("Ventas del 17 al 18 de junio:");
console.log(
  filtrarVentasPorRangoFechas(ventas, "2024-06-17", "2024-06-18").map(
    (v) => `${v.id} (${v.localId})`
  )
);

sub("Empleados con rol 'cocinero':");
console.log(filtrarEmpleadosPorRol(empleados, "cocinero").map((e) => e.nombre));

sub("Clientes sin visita en 10+ días:");
console.log(
  filtrarClientesInactivosPorDias(clientes, 10).map(
    (c) => `${c.nombre} ${c.apellido}`
  )
);

// ───────────────────────────────────────────────
separador("2. BÚSQUEDAS");

sub("Búsqueda lineal — Local 'MIA-001':");
console.log(buscarLocalPorId(locales, "MIA-001")?.nombre ?? "No encontrado");

sub("Búsqueda lineal — Ingrediente 'ING-005':");
console.log(
  buscarIngredientePorId(ingredientes, "ING-005")?.nombre ?? "No encontrado"
);

sub("Búsqueda lineal — Empleado por email:");
console.log(
  buscarEmpleadoPorEmail(empleados, "f.guerrero@brasaland.co")?.nombre ??
    "No encontrado"
);

sub("Búsqueda lineal — Cliente por email:");
console.log(
  buscarClientePorEmail(clientes, "j.smith@outlook.com")
    ? "Jennifer Smith encontrada ✓"
    : "No encontrada"
);

// Array ordenado por id para búsqueda binaria
const localesOrdenados = [...locales].sort((a, b) =>
  a.id.localeCompare(b.id)
);
sub("Búsqueda binaria — Local 'MED-002' (array ordenado por ID):");
console.log(
  buscarLocalPorIdBinario(localesOrdenados, "MED-002")?.nombre ??
    "No encontrado"
);

sub("Búsqueda binaria — Local 'XXX-999' (no existe):");
console.log(
  buscarLocalPorIdBinario(localesOrdenados, "XXX-999") ?? "null ✓ (esperado)"
);

sub("Búsqueda binaria — Local en array vacío:");
console.log(buscarLocalPorIdBinario([], "MED-001") ?? "null ✓ (esperado)");

const ingredientesOrdenados = [...ingredientes].sort((a, b) =>
  a.id.localeCompare(b.id)
);
sub("Búsqueda binaria — Ingrediente 'ING-003':");
console.log(
  buscarIngredientePorIdBinario(ingredientesOrdenados, "ING-003")?.nombre ??
    "No encontrado"
);

const ventasOrdenadas = [...ventas].sort((a, b) =>
  a.fecha.localeCompare(b.fecha)
);
sub("Búsqueda binaria — Venta por fecha '2024-06-18':");
const ventaEncontrada = buscarVentaPorFechaBinario(
  ventasOrdenadas,
  "2024-06-18"
);
console.log(
  ventaEncontrada
    ? `Encontrada: ${ventaEncontrada.id} (${ventaEncontrada.localId})`
    : "No encontrada"
);

// ───────────────────────────────────────────────
separador("3. TRANSFORMACIONES Y AGREGACIONES");

sub("Locales por país:");
console.log(contarLocalesPorPais(locales));

sub("Empleados por rol:");
console.log(contarEmpleadosPorRol(empleados));

sub("Total ventas MED-001:");
const ventasMed = ventas.filter((v) => v.localId === "MED-001");
console.log(
  `COP ${sumarTotalVentas(ventasMed).toLocaleString("es-CO")}`
);

sub("Ventas por local:");
console.log(sumarVentasPorLocal(ventas));

sub("Ticket promedio MED-001:");
console.log(`COP ${calcularTicketPromedio(ventasMed).toLocaleString("es-CO")}`);

sub("Promedio Brasa Points:");
console.log(calcularPromedioBrasaPoints(clientes).toFixed(0));

sub("Venta máxima del período:");
const maxVenta = encontrarVentaMaxima(ventas);
console.log(
  maxVenta
    ? `${maxVenta.id} — Total: ${maxVenta.totalVenta.toLocaleString()}`
    : "Sin ventas"
);

sub("Cliente con más Brasa Points:");
const topCliente = encontrarClienteConMasPuntos(clientes);
console.log(
  topCliente
    ? `${topCliente.nombre} ${topCliente.apellido} (${topCliente.brasaPoints} pts)`
    : "Sin clientes"
);

sub("Platillo más vendido (global):");
console.log(obtenerPlatilloMasVendido(ventas));

sub("Ventas ordenadas por total (mayor a menor):");
console.log(
  ordenarVentasPorTotal(ventas).map(
    (v) => `${v.id}: ${v.totalVenta.toLocaleString()} ${v.moneda}`
  )
);

sub("Alertas de stock crítico:");
const alertas = generarAlertasStockCritico(inventarios, ingredientes, locales);
alertas.forEach((a) => {
  console.log(
    `  ⚠️  [${a.nombreLocal}] ${a.nombreIngrediente}: tiene ${a.cantidadActual}, mínimo ${a.stockMinimo} → déficit: ${a.deficit}`
  );
});

sub("Reporte semanal MED-001 (semana 2024-W25):");
const reporte = generarReporteVentasLocal(
  ventas,
  locales.find((l) => l.id === "MED-001")!,
  "2024-W25"
);
console.log(reporte);

sub("Reporte consolidado cadena:");
const consolidado = generarReporteConsolidado(
  ventas,
  ordenes,
  locales,
  alertas,
  "2024-W25"
);
console.log(consolidado);

sub("Resumen de clientes:");
console.log(generarResumenClientes(clientes));

// ───────────────────────────────────────────────
separador("4. VALIDACIONES DE NEGOCIO");

sub("Validar local válido (MED-001):");
console.log(validarLocal(locales[0]));

sub("Validar local con errores (país-moneda incoherente):");
const localInvalido: Local = {
  ...locales[0],
  id: "ERR-001",
  pais: "Colombia",
  monedaLocal: "USD",  // ← error
  fechaApertura: "2030-01-01",  // ← error: futura
};
const resLocal = validarLocal(localInvalido);
console.log(resLocal);

sub("Validar ingrediente válido:");
console.log(validarIngrediente(ingredientes[0]));

sub("Validar ingrediente con stock mínimo = 0:");
const ingInvalido: Ingrediente = { ...ingredientes[0], stockMinimo: 0 };
console.log(validarIngrediente(ingInvalido));

sub("Validar receta válida:");
console.log(validarReceta(recetas[0]));

sub("Validar proveedor válido:");
console.log(validarProveedor(proveedores[0]));

sub("Validar orden de compra válida (OC-2024-001):");
console.log(validarOrdenCompra(ordenes[0]));

sub("Validar orden con subtotal incorrecto:");
const ordenInvalida: OrdenCompra = {
  ...ordenes[1],
  lineas: [
    {
      ingredienteId: "ING-001",
      cantidadSolicitada: 10,
      precioUnitario: 8.5,
      subtotal: 999,  // ← incorrecto (debería ser 85)
    },
  ],
  totalOrden: 999,
};
console.log(validarOrdenCompra(ordenInvalida));

sub("Validar venta diaria válida:");
console.log(validarVentaDiaria(ventas[0]));

sub("Validar empleado válido:");
console.log(validarEmpleado(empleados[0]));

sub("Validar empleado con salario bajo (Colombia):");
const empInvalido: Empleado = {
  ...empleados[0],
  salario: 500_000,  // ← por debajo del mínimo
};
console.log(validarEmpleado(empInvalido));

sub("Validar cliente válido:");
console.log(validarCliente(clientes[0]));

sub("Validar cliente con última visita anterior al registro:");
const clienteInvalido: Cliente = {
  ...clientes[0],
  fechaRegistro: "2024-01-01",
  ultimaVisita: "2023-12-01",  // ← anterior al registro
};
console.log(validarCliente(clienteInvalido));

separador("✅ DEMO COMPLETADO — Todas las utilidades Brasaland funcionan correctamente");
