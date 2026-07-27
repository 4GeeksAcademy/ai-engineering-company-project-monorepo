import { BackofficeShell } from "@/components/layout/BackofficeShell";
import { OperationsDashboard } from "@/components/dashboard/OperationsDashboard";
import { getOperationsSnapshot } from "@/lib/operations";

export default function HomePage() {
  const data = getOperationsSnapshot();

  return (
    <BackofficeShell>
      <OperationsDashboard data={data} />
    </BackofficeShell>
  );
}
