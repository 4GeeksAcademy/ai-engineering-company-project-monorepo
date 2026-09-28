import type { DataSource } from "@/lib/types";

export function SourceBanner({ source, notice }: { source: DataSource; notice?: string }) {
  const label =
    source === "live"
      ? "Reading the Brasaland central API."
      : "Fixture mode. Set BRASALAND_DATA_SOURCE=live to call the central API.";
  return (
    <p className="banner" role="status">
      {notice ?? label}
    </p>
  );
}
