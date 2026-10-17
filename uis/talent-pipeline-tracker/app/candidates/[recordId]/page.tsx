import { TalentPipelineTracker } from "@/components/talent-pipeline-tracker";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = await params;

  return <TalentPipelineTracker initialRecordId={recordId} />;
}