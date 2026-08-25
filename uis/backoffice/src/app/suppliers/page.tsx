import SuppliersClient from "./suppliers-client";
import type { Supplier } from "./suppliers-client";


async function getInitialSuppliers(): Promise<Supplier[]> {
  try {
    const response = await fetch("http://127.0.0.1:8000/suppliers", {
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as Supplier[];
  } catch {
    return [];
  }
}


export default async function SuppliersPage() {
  const initialSuppliers = await getInitialSuppliers();
  return <SuppliersClient initialSuppliers={initialSuppliers} />;
}
