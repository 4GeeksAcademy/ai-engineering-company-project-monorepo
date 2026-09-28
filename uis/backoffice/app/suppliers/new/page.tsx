import NewSupplierForm from "@/components/NewSupplierForm";
import BackLink from "@/components/BackLink";
import PageHeader from "@/components/PageHeader";

export default function NewSupplierPage() {
  return (
    <div>
      <BackLink href="/suppliers">Back to suppliers</BackLink>

      <PageHeader
        title="New supplier"
        description="Register a new supplier in the directory."
      />

      <NewSupplierForm />
    </div>
  );
}
