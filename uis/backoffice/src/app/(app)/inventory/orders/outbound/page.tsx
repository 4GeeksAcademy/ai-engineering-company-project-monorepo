import type { Metadata } from "next";
import OutboundOrderPage from "@/views/OutboundOrderPage";
import { assetIdFromQuery } from "@/lib/inventoryRules";

export const metadata: Metadata = { title: "Salida de activos" };

// `?asset=<id>` comes from the "Salida" link of a row of the stock page and preselects that asset.
export default async function Page({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { asset } = await searchParams;
  return <OutboundOrderPage initialAssetId={assetIdFromQuery(asset)} />;
}
