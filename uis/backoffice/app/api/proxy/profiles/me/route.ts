import { proxyAuthenticated } from "@/lib/backend-proxy";

export async function GET(request: Request) {
  return proxyAuthenticated(request, "/profiles/me", "GET");
}

export async function PUT(request: Request) {
  return proxyAuthenticated(request, "/profiles/me", "PUT");
}