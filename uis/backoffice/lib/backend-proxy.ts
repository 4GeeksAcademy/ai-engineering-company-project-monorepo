import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export async function proxyPost(request: Request, endpoint: string) {
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    });
    const body = await response.text();

    return new NextResponse(response.status === 204 ? null : body, {
      status: response.status,
      headers:
        response.status === 204 ? undefined : { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { detail: "Authentication service is unavailable" },
      { status: 503 },
    );
  }
}

export async function proxyAuthenticated(
  request: Request,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  try {
    const hasBody = method === "POST" || method === "PUT" || method === "PATCH";
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method,
      headers: {
        Authorization: authorization,
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? await request.text() : undefined,
    });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { detail: "Profile service is unavailable" },
      { status: 503 },
    );
  }
}