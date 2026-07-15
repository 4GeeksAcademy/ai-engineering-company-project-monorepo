type FormField = {
  label: string;
  type: "text" | "email" | "tel" | "date";
  placeholder?: string;
  required?: boolean;
};

const personalFields: FormField[] = [
  { label: "Nombre completo", type: "text", placeholder: "Ej: Maria Garcia", required: true },
  { label: "Correo", type: "email", placeholder: "ejemplo@correo.com", required: true },
  { label: "Telefono", type: "tel", placeholder: "+57 300 123 4567", required: true },
  { label: "Fecha de nacimiento", type: "date", required: true },
];

export default function CareersPage() {
  return (
    <main className="section" style={{ minHeight: "100vh", paddingTop: "6rem" }}>
      <div className="container" style={{ display: "grid", gap: "1rem" }}>
        <header className="section-title">
          <p className="eyebrow">Talento Brasaland</p>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.2rem)", textTransform: "uppercase" }}>
            Trabaja con Nosotros
          </h1>
          <p className="subtitle">
            Formulario de postulacion inicial para equipos de cocina, servicio,
            supervision y administracion en Colombia y Florida.
          </p>
        </header>

        <section className="glass-card" style={{ borderRadius: "1.2rem", padding: "1rem" }}>
          <h2 style={{ marginBottom: "0.8rem" }}>Informacion Personal</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "0.7rem",
            }}
          >
            {personalFields.map((field) => (
              <label key={field.label} style={{ display: "grid", gap: "0.35rem", color: "var(--muted)" }}>
                <span style={{ fontSize: "0.86rem" }}>{field.label}</span>
                <input
                  type={field.type}
                  required={field.required}
                  placeholder={field.placeholder}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.7rem",
                    padding: "0.65rem 0.75rem",
                    color: "var(--fg)",
                  }}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="glass-card" style={{ borderRadius: "1.2rem", padding: "1rem" }}>
          <h2 style={{ marginBottom: "0.8rem" }}>Ubicacion y Puesto</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "0.7rem",
            }}
          >
            <label style={{ display: "grid", gap: "0.35rem", color: "var(--muted)" }}>
              <span style={{ fontSize: "0.86rem" }}>Pais</span>
              <select
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.7rem",
                  padding: "0.65rem 0.75rem",
                  color: "var(--fg)",
                }}
              >
                <option>Colombia</option>
                <option>USA (Florida)</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: "0.35rem", color: "var(--muted)" }}>
              <span style={{ fontSize: "0.86rem" }}>Puesto</span>
              <select
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.7rem",
                  padding: "0.65rem 0.75rem",
                  color: "var(--fg)",
                }}
              >
                <option>Cocina</option>
                <option>Servicio</option>
                <option>Caja</option>
                <option>Supervision</option>
                <option>Administracion</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: "0.35rem", color: "var(--muted)" }}>
              <span style={{ fontSize: "0.86rem" }}>Experiencia</span>
              <select
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.7rem",
                  padding: "0.65rem 0.75rem",
                  color: "var(--fg)",
                }}
              >
                <option>Sin experiencia</option>
                <option>1 a 3 anos</option>
                <option>3 a 5 anos</option>
                <option>Mas de 5 anos</option>
              </select>
            </label>
          </div>
          <button className="btn btn-primary" style={{ marginTop: "0.9rem" }}>
            Enviar Aplicacion
          </button>
        </section>
      </div>
    </main>
  );
}
