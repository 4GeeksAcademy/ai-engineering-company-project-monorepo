interface KpiItem {
  label: string;
  value: string;
}

const items: KpiItem[] = [
  { label: "Locales propios", value: "14" },
  { label: "Empleados", value: "~115" },
  { label: "Facturacion anual", value: "USD 6M" },
  { label: "Mercados", value: "Colombia + Florida" },
];

export function KpiStrip() {
  return (
    <section className="kpi-strip" aria-label="Indicadores de Brasaland">
      {items.map((item) => (
        <article key={item.label}>
          <p>{item.label}</p>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  );
}
