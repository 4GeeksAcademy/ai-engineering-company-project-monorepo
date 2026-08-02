import {
  buildBrasalandSnapshot,
  type BrasalandBusinessInput,
} from "@repo/shared-types";

const sampleInput: BrasalandBusinessInput = {
  weekLabel: "Semana 31 - 2026",
  sales: [
    {
      storeId: "co-med-01",
      storeName: "Brasaland El Poblado",
      country: "CO",
      currency: "COP",
      orders: 1120,
      revenue: 179_200_000,
      averageTicket: 160_000,
    },
    {
      storeId: "co-bog-01",
      storeName: "Brasaland Zona T",
      country: "CO",
      currency: "COP",
      orders: 990,
      revenue: 145_530_000,
      averageTicket: 147_000,
    },
    {
      storeId: "us-mia-01",
      storeName: "Brasaland Doral",
      country: "US",
      currency: "USD",
      orders: 780,
      revenue: 45_240,
      averageTicket: 58,
    },
  ],
  inventory: [
    {
      storeId: "co-med-01",
      storeName: "Brasaland El Poblado",
      ingredient: "Pechuga marinada",
      availableUnits: 70,
      estimatedWeeklyDemand: 92,
    },
    {
      storeId: "us-mia-01",
      storeName: "Brasaland Doral",
      ingredient: "Costilla premium",
      availableUnits: 64,
      estimatedWeeklyDemand: 60,
    },
  ],
  suppliers: [
    {
      supplierName: "Carnes Andinas",
      category: "Proteinas",
      priceChangePct: 8.5,
    },
    {
      supplierName: "Fresh Citrus FL",
      category: "Bebidas",
      priceChangePct: 3.2,
    },
  ],
  hr: [
    {
      country: "CO",
      turnoverPct: 16,
      absenteeismPct: 6,
      daysToFillVacancy: 34,
    },
    {
      country: "US",
      turnoverPct: 21,
      absenteeismPct: 8,
      daysToFillVacancy: 43,
    },
  ],
};

export default function Home() {
  const snapshot = buildBrasalandSnapshot(sampleInput);

  return (
    <div className="backoffice-shell">
      <aside className="sidebar">
        <p className="chip">Backoffice</p>
        <h1>Brasaland Control Center</h1>
        <p>Vista de entrada para operaciones, compras y direccion ejecutiva.</p>
      </aside>

      <main className="main-panel">
        <section className="panel">
          <h2>Resumen semanal ({snapshot.weekLabel})</h2>
          <div className="grid two">
            {snapshot.marketSummary.map((market) => (
              <article key={market.country} className="metric">
                <p>
                  {market.country === "CO" ? "Colombia" : "Florida"} · {market.currency}
                </p>
                <strong>
                  {market.revenue.toLocaleString("es-CO", {
                    maximumFractionDigits: 2,
                  })}
                </strong>
                <span>
                  {market.orders} pedidos · ticket prom. {market.averageTicket.toLocaleString("es-CO")}
                </span>
              </article>
            ))}
          </div>
          {snapshot.topTicketStore ? (
            <p className="note">
              Ticket mas alto del periodo: {snapshot.topTicketStore.storeName} ({" "}
              {snapshot.topTicketStore.averageTicket.toLocaleString("es-CO")} {" "}
              {snapshot.topTicketStore.currency})
            </p>
          ) : null}
        </section>

        <section className="panel">
          <h2>Alertas operativas y de gestion</h2>
          <div className="grid three">
            <article>
              <h3>Stock</h3>
              <ul>
                {snapshot.stockRiskAlerts.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>Proveedores</h3>
              <ul>
                {snapshot.supplierAlerts.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>RRHH</h3>
              <ul>
                {snapshot.hrAlerts.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            </article>
          </div>
          <p className="note">
            Modulo importado desde el monorepo: packages/shared/types/index.ts
          </p>
        </section>
      </main>
    </div>
  );
}
