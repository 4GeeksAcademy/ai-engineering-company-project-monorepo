import { proxyAuthenticated } from "@/lib/backend-proxy";

export async function POST(request: Request) {
  return proxyAuthenticated(request, "/auth/change-password", "POST");
}