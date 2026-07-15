export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a1618", color: "#ecfbf7" }}>
      <main style={{ width: "min(1060px, 92%)", margin: "0 auto", padding: "2.4rem 0" }}>
        <header style={{ marginBottom: "1.2rem" }}>
          <p style={{ color: "#6ce6cb", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "0.74rem", fontWeight: 700 }}>
            Operations UI
          </p>
          <h1 style={{ marginTop: "0.45rem", fontSize: "clamp(2rem, 5vw, 3rem)" }}>
            Control de locales en tiempo real
          </h1>
          <p style={{ color: "#b8d4cd", marginTop: "0.55rem", maxWidth: 700 }}>
            Entrada inicial para seguimiento operativo, alertas de venta y coordinacion de inventario por local.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.8rem",
            marginBottom: "1rem",
          }}
        >
          {[
            ["Locales reportando", "12 / 14"],
            ["Alertas de no-venta", "2"],
            ["Pedidos pendientes", "9"],
          ].map(([k, v]) => (
            <article
              key={k}
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: "14px",
                padding: "0.9rem",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <p style={{ color: "#b8d4cd", fontSize: "0.84rem" }}>{k}</p>
              <h2 style={{ fontSize: "1.9rem", marginTop: "0.15rem" }}>{v}</h2>
            </article>
          ))}
        </section>

        <section
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: "14px",
            padding: "1rem",
            background: "linear-gradient(140deg, rgba(108,230,203,0.15), rgba(255,255,255,0.03))",
          }}
        >
          <h3 style={{ marginBottom: "0.5rem" }}>Prioridades del dia</h3>
          <ul style={{ lineHeight: 1.6, color: "#d2ebe5", paddingLeft: "1rem" }}>
            <li>Validar reposicion de carne y bebidas en MED-001.</li>
            <li>Confirmar envio de proveedor para MIA-001 antes de 3pm.</li>
            <li>Escalar locales sin ventas durante horario operativo.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
