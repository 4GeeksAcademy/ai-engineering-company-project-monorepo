import { Metadata } from "next";
import { CandidateDetailPage } from "./CandidateDetailPage";

export const metadata: Metadata = {
  title: "Detalle | Talent Tracker",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CandidateDetailPage recordId={id} />;
}
