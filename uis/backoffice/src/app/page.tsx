import type { InventarioLocal, Ingrediente, Local, VentaDiaria } from "../../../../src/types/models";
import {
  calcularTicketPromedio,
  generarAlertasStockCritico,
  sumarTotalVentas,
  sumarVentasPorLocal,
} from "../../../../src/utils/transformations";
import { validarVentaDiaria } from "../../../../src/utils/validations";
import { BackofficeHeader } from "@/components/backoffice-header";

const locales: Local[] = [
  {
    id: "MED-001",
    nombre: "Brasaland El Poblado",
    ciudad: "Medellin",
    pais: "Colombia",
    monedaLocal: "COP",
    direccion: "Cra. 37 #8A-29",
    telefono: "+57 300 100100",
    supervisorId: "EMP-SUP-001",
    activo: true,
    fechaApertura: "2015-03-10",
  },
  {
    id: "MIA-001",
    nombre: "Brasaland Miami Downtown",
    ciudad: "Miami",
    pais: "USA",
    monedaLocal: "USD",
    direccion: "100 Brickell Ave",
    telefono: "+1 305 5551234",
    supervisorId: "EMP-SUP-003",
    activo: true,
    fechaApertura: "2021-06-01",
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
    id: "ING-003",
    nombre: "Tomate (kg)",
    categoria: "verdura",
    unidadMedida: "kg",
    stockMinimo: 10,
    perecedero: true,
  },
  {
    id: "ING-006",
    nombre: "Gaseosa Cola (litros)",
    categoria: "bebida",
    unidadMedida: "litros",
    stockMinimo: 50,
    perecedero: false,
  },
];

const inventarios: InventarioLocal[] = [
  {
    localId: "MED-001",
    ingredienteId: "ING-001",
    cantidadActual: 8,
    fechaUltimaActualizacion: "2026-07-14",
  },
  {
    localId: "MED-001",
    ingredienteId: "ING-003",
    cantidadActual: 4,
    fechaUltimaActualizacion: "2026-07-14",
  },
  {
    localId: "MIA-001",
    ingredienteId: "ING-006",
    cantidadActual: 14,
    fechaUltimaActualizacion: "2026-07-14",
  },
];

const ventas: VentaDiaria[] = [
  {
    id: "V-2026-001",
    localId: "MED-001",
    fecha: "2026-07-14",
    lineas: [
      { recetaId: "REC-001", cantidad: 42, precioUnitario: 52000, subtotal: 2184000 },
      { recetaId: "REC-003", cantidad: 55, precioUnitario: 42000, subtotal: 2310000 },
    ],
    totalVenta: 4494000,
    moneda: "COP",
    totalCovers: 118,
  },
  {
    id: "V-2026-002",
    localId: "MIA-001",
    fecha: "2026-07-14",
    lineas: [
      { recetaId: "REC-001", cantidad: 31, precioUnitario: 18.99, subtotal: 588.69 },
      { recetaId: "REC-003", cantidad: 43, precioUnitario: 14.99, subtotal: 644.57 },
    ],
    totalVenta: 1233.26,
    moneda: "USD",
    totalCovers: 97,
  },
];

export default function Home() {
  const salesByLocal = sumarVentasPorLocal(ventas);
  const ticketPromedio = calcularTicketPromedio(ventas);
  const totalVentasPeriodo = sumarTotalVentas(ventas);
  const alertas = generarAlertasStockCritico(inventarios, ingredientes, locales);
  const validacionVentas = ventas.map((venta) => ({
    id: venta.id,
    resultado: validarVentaDiaria(venta),
  }));

  return (
    <div className="backoffice-page">
      <BackofficeHeader activeView="overview" badge="Hito 2 integrado por import" />

      <main className="container bo-main">
        <section className="kpi-grid">
          <article className="card">
            <h3>Locales monitoreados</h3>
            <p className="kpi-number">{locales.length}</p>
            <p className="kpi-sub">Colombia + USA</p>
          </article>
          <article className="card">
            <h3>Ventas del periodo</h3>
            <p className="kpi-number">{Math.round(totalVentasPeriodo).toLocaleString()}</p>
            <p className="kpi-sub">Suma por transformaciones.ts</p>
          </article>
          <article className="card">
            <h3>Ticket promedio</h3>
            <p className="kpi-number kpi-good">{ticketPromedio.toFixed(2)}</p>
            <p className="kpi-sub">Calculado desde ventas reales</p>
          </article>
          <article className="card">
            <h3>Alertas de stock</h3>
            <p className="kpi-number kpi-warn">{alertas.length}</p>
            <p className="kpi-sub">Ingredientes bajo minimo</p>
          </article>
        </section>

        <section className="card spotlight-card">
          <div>
            <p className="eyebrow">Nuevo modulo</p>
            <h2>Analizador de incidencias operativo</h2>
            <p className="muted">
              El equipo ya puede cargar el CSV de incidencias, validar registros corruptos, revisar el resumen y exportar los resultados desde la nueva vista interna.
            </p>
          </div>
          <a className="primary-button link-button" href="/incidents">
            Abrir analizador
          </a>
        </section>

        <section className="panel-grid">
          <article className="card">
            <h2>Ventas por local</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Local</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(salesByLocal).map(([localId, total]) => (
                  <tr key={localId}>
                    <td>{localId}</td>
                    <td>{total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted" style={{ marginTop: "0.7rem" }}>
              Datos obtenidos con import directo desde src/utils/transformations.ts.
            </p>
          </article>

          <article className="card">
            <h2>Estado de validaciones</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Venta</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {validacionVentas.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>
                      <span className={`chip ${item.resultado.valido ? "chip-ok" : "chip-danger"}`}>
                        {item.resultado.valido ? "Valida" : "Con errores"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </section>

        <section className="card">
          <h2 style={{ marginBottom: "0.7rem" }}>Alertas de stock critico</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Local</th>
                <th>Ingrediente</th>
                <th>Actual</th>
                <th>Minimo</th>
                <th>Deficit</th>
              </tr>
            </thead>
            <tbody>
              {alertas.map((alerta) => (
                <tr key={`${alerta.localId}-${alerta.ingredienteId}`}>
                  <td>{alerta.nombreLocal}</td>
                  <td>{alerta.nombreIngrediente}</td>
                  <td>{alerta.cantidadActual}</td>
                  <td>{alerta.stockMinimo}</td>
                  <td>{alerta.deficit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
