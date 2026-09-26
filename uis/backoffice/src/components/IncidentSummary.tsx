import type { AnalysisResult, ProblemKind } from "@/lib/incidentsApi";

const RULE_LABELS: Record<string, string> = {
  missing_client_company: "Falta client_company",
  invalid_category: "Categoría vacía o no válida",
  invalid_description: "Descripción vacía o de menos de 5 caracteres",
  invalid_agent_id: "agent_id vacío o sin formato AGT-XX",
  invalid_email: "Email vacío o no válido",
  closed_without_score: "Ticket cerrado sin puntuación",
  invalid_score: "Puntuación fuera de rango (1-5)",
  invalid_status: "Estado vacío o no válido",
  invalid_ticket_id: "ticket_id vacío o sin formato NXV-XXXXXX",
  invalid_date: "Fecha vacía o no válida (YYYY-MM-DD)",
};
const PROBLEM_LABELS: Record<ProblemKind, string> = { missing: "valor faltante", invalid: "valor no permitido" };
const SCORE_LABELS: Record<string, string> = {
  "1": "Muy insatisfecho", "2": "Insatisfecho", "3": "Neutral", "4": "Satisfecho", "5": "Muy satisfecho",
};

const pct = (value: number, total: number) => (total ? `${((value / total) * 100).toFixed(1)}%` : "0.0%");

function Breakdown({ title, counts, total }: { title: string; counts: Record<string, number>; total: number }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <table>
        <thead><tr><th scope="col">Valor</th><th scope="col" className="num">Registros</th><th scope="col" className="num">%</th><th scope="col" aria-hidden="true" /></tr></thead>
        <tbody>
          {Object.entries(counts).map(([key, count]) => (
            <tr key={key}>
              <td><code>{key}</code></td>
              <td className="num">{count}</td>
              <td className="num">{pct(count, total)}</td>
              <td className="bar-cell" aria-hidden="true"><span className="bar" style={{ width: pct(count, total) }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">Porcentajes sobre {total} registros válidos.</p>
    </section>
  );
}

function InvalidRecords({ result }: { result: AnalysisResult }) {
  if (result.invalid_records === 0) {
    return <section className="card ok"><h2>Registros inválidos</h2><p>No se encontraron registros inválidos.</p></section>;
  }
  const problems = Object.entries(result.invalid_by_field).flatMap(([field, kinds]) =>
    Object.entries(kinds).map(([kind, count]) => ({ field, kind: kind as ProblemKind, count: count ?? 0 })),
  );
  return (
    <section className="card warn" aria-labelledby="invalid-title">
      <h2 id="invalid-title">Registros inválidos: {result.invalid_records} de {result.total_records}</h2>
      <p>Estos registros se han <strong>excluido</strong> de las métricas por categoría, estado y satisfacción. Un registro puede tener más de un problema.</p>
      <div className="two-col">
        <div>
          <h3>Por regla</h3>
          <table><tbody>
            {Object.entries(result.invalid_breakdown).map(([rule, count]) => (
              <tr key={rule}><td>{RULE_LABELS[rule] ?? result.labels.rules[rule] ?? rule}</td><td className="num">{count}</td></tr>
            ))}
          </tbody></table>
        </div>
        <div>
          <h3>Por campo y tipo de problema</h3>
          <table><tbody>
            {problems.map(({ field, kind, count }) => (
              <tr key={`${field}-${kind}`}>
                <td><code>{field}</code> — <span className={`tag ${kind}`}>{PROBLEM_LABELS[kind] ?? kind}</span></td>
                <td className="num">{count}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>
    </section>
  );
}

function Satisfaction({ result }: { result: AnalysisResult }) {
  const maxCount = Math.max(1, ...Object.values(result.score_breakdown));
  return (
    <section className="card">
      <h2>Índice de satisfacción (tickets cerrados)</h2>
      <p className="big">{result.average_score === null ? "N/A" : result.average_score.toFixed(2)} <span className="muted">/ 5.00</span></p>
      <p className="muted">Calculado sobre {result.scored_tickets} de {result.closed_tickets} tickets cerrados con puntuación registrada.</p>
      <table>
        <tbody>
          {Object.entries(result.score_breakdown).map(([score, count]) => (
            <tr key={score}>
              <td>{score} · {SCORE_LABELS[score] ?? result.labels.scores[score]}</td>
              <td className="num">{count}</td>
              <td className="bar-cell" aria-hidden="true"><span className="bar" style={{ width: `${(count / maxCount) * 100}%` }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function IncidentSummary({ result }: { result: AnalysisResult }) {
  return (
    <>
      <section className="card" aria-label="Métricas generales">
        <h2>Métricas generales</h2>
        <div className="stats">
          <div className="stat"><span>Total en el archivo</span><strong>{result.total_records}</strong></div>
          <div className="stat"><span>Registros válidos</span><strong>{result.valid_records}</strong></div>
          <div className="stat"><span>Registros inválidos</span><strong className={result.invalid_records ? "danger" : ""}>{result.invalid_records}</strong></div>
          <div className="stat"><span>Satisfacción media</span><strong>{result.average_score?.toFixed(2) ?? "N/A"}</strong></div>
        </div>
      </section>
      <InvalidRecords result={result} />
      <div className="two-col">
        <Breakdown title="Desglose por categoría" counts={result.by_category} total={result.valid_records} />
        <Breakdown title="Desglose por estado" counts={result.by_status} total={result.valid_records} />
      </div>
      <Satisfaction result={result} />
    </>
  );
}
