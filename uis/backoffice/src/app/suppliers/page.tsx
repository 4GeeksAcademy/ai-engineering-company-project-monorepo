import { SupplierDirectory } from "@/components/supplier-directory"

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; category?: string }>
}) {
  const params = await searchParams
  return (
    <SupplierDirectory
      initialCountry={params.country ?? ""}
      initialCategory={params.category ?? ""}
    />
  )
}
