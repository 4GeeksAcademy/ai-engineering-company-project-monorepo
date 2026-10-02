import { proxyPost } from "@/lib/backend-proxy";

export async function POST(request: Request) {
  return proxyPost(request, "/auth/forgot-password");
}