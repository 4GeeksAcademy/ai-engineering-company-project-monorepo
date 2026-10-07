const BACKEND_BASE_URL =
  process.env.INCIDENTS_API_INTERNAL_URL?.trim() || "http://127.0.0.1:8000";

export async function GET(): Promise<Response> {
  try {
    const upstream = await fetch(`${BACKEND_BASE_URL}/api/incidents/results/export`, {
      method: "GET",
    });

    const bytes = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") ?? "text/csv";
    const disposition =
      upstream.headers.get("content-disposition") ?? 'attachment; filename="results.csv"';

    return new Response(bytes, {
      status: upstream.status,
      headers: {
        "content-type": contentType,
        "content-disposition": disposition,
      },
    });
  } catch {
    return Response.json(
      {
        detail: "No se pudo conectar con el backend de incidencias. Verifica que la API este corriendo.",
      },
      { status: 502 }
    );
  }
}