import { proxyAuthenticated } from "@/lib/backend-proxy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyAuthenticated(request, `/suppliers/${id}/rate`, "PATCH");
}
