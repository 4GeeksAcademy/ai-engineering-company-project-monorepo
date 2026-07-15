export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "#0f1320", color: "#f7f2e8" }}>
      <main style={{ width: "min(1040px, 92%)", margin: "0 auto", padding: "2.5rem 0" }}>
        <header style={{ display: "grid", gap: "0.8rem", marginBottom: "1.5rem" }}>
          <p style={{ color: "#ffb86b", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, fontSize: "0.72rem" }}>
            Loyalty App
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>Brasa Points Hub</h1>
          <p style={{ color: "#c6c0b5", maxWidth: 680 }}>
            Vista inicial de fidelizacion: puntos, beneficios y segmentos para activar campañas por WhatsApp.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.8rem",
            marginBottom: "1rem",
          }}
        >
          {[
            ["Usuarios activos", "2,840"],
            ["Puntos canjeados", "129,400"],
            ["Clientes dormidos", "640"],
            ["Campanas listas", "7"],
          ].map(([label, value]) => (
            <article
              key={label}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "14px",
                padding: "0.9rem",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <p style={{ color: "#c6c0b5", fontSize: "0.82rem" }}>{label}</p>
              <h2 style={{ fontSize: "1.8rem", marginTop: "0.2rem" }}>{value}</h2>
            </article>
          ))}
        </section>

        <section
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "14px",
            padding: "1rem",
            background: "linear-gradient(140deg, rgba(255,184,107,0.14), rgba(255,255,255,0.04))",
          }}
        >
          <h3 style={{ marginBottom: "0.55rem" }}>Flujo activable en proximos hitos</h3>
          <ol style={{ color: "#d8d1c5", lineHeight: 1.5, paddingLeft: "1rem" }}>
            <li>Deteccion de clientes sin visita en 10 dias.</li>
            <li>Generacion de incentivo personalizado.</li>
            <li>Disparo de mensaje por WhatsApp y seguimiento de conversion.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
