import { AppShell } from "../app-shell";
import { SupplierDirectory } from "./supplier-directory";

export default function SuppliersPage() {
  return (
    <AppShell current="suppliers">
      <SupplierDirectory />
    </AppShell>
  );
}
