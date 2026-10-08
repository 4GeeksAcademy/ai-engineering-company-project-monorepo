import AuthGuard from "@/components/AuthGuard";

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
