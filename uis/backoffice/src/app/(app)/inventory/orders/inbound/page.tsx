import type { Metadata } from "next";
import InboundOrderPage from "@/views/InboundOrderPage";
import { assetIdFromQuery } from "@/lib/inventoryRules";

export const metadata: Metadata = { title: "Entrada de activos" };

// `?asset=<id>` comes from the "Entrada" link of a row of the stock page and preselects that asset.
export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { asset } = await searchParams;
  return <InboundOrderPage initialAssetId={assetIdFromQuery(asset)} />;
}
