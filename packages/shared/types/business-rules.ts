import {
  Branch,
  BranchMenuAvailability,
  MenuItem,
  PrepTimeByCategory,
  Promotion,
  Region,
} from "./entities";

export function isMenuItemAvailableAtBranch(
  item: MenuItem,
  branchAvailability: BranchMenuAvailability | undefined,
): boolean {
  const effectiveAvailability = branchAvailability?.availability ?? item.availability;
  return effectiveAvailability === "available" || effectiveAvailability === "seasonal";
}

export function getPrepTimeMinutes(
  item: MenuItem,
  prepTimes: PrepTimeByCategory[],
): number | null {
  const match: PrepTimeByCategory | undefined = prepTimes.find(
    (entry: PrepTimeByCategory) => entry.category === item.category,
  );
  return match ? match.prep_time_minutes : null;
}

export function isPromotionActiveForRegion(
  promotion: Promotion,
  region: Region,
  at: Date,
): boolean {
  if (promotion.region !== region) return false;

  const startsAt: number = new Date(promotion.starts_at).getTime();
  const endsAt: number = new Date(promotion.ends_at).getTime();
  const target: number = at.getTime();

  return target >= startsAt && target <= endsAt;
}

export function getComplianceRegionForBranch(branch: Branch): Region {
  return branch.country === "Colombia" ? "Colombia" : "Florida";
}
