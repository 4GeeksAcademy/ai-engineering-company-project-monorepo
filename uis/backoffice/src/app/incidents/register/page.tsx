import { IncidentForm } from "@/components/incident-form";

export default function RegisterIncidentPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Register an incident</h2>
        <p className="mt-2 text-muted-foreground">
          Log a clinic, customer, or internal incident. Identifying patient data is not allowed.
        </p>
      </div>
      <IncidentForm />
    </div>
  );
}
