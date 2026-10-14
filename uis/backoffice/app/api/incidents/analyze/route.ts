const BACKEND_BASE_URL =
  process.env.INCIDENTS_API_INTERNAL_URL?.trim() || "http://127.0.0.1:8000";

export async function POST(request: Request): Promise<Response> {
  const body = await request.formData();

  try {
    const upstream = await fetch(`${BACKEND_BASE_URL}/api/incidents/analyze`, {
      method: "POST",
      body,
    });

    const payload = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "application/json";

    return new Response(payload, {
      status: upstream.status,
      headers: {
        "content-type": contentType,
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