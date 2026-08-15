export type {
  MinMaxResult,
  KpiOverview,
} from "../../packages/shared/types/aggregations";

import { buildKpiOverview } from "../../packages/shared/types/aggregations";
import { KpiSnapshot } from "../../packages/shared/types/entities";
import {
  ensureValidBeforeProcessing,
  validateKpiSnapshot,
} from "../../packages/shared/types/validations";
import type { KpiOverview } from "../../packages/shared/types/aggregations";

export {
  countByCategory,
  sumBy,
  maxBy,
  minBy,
  averageBy,
  minMaxBy,
  buildKpiOverview,
} from "../../packages/shared/types/aggregations";

export function buildValidatedKpiOverview(snapshots: KpiSnapshot[]): KpiOverview {
  for (const snapshot of snapshots) {
    ensureValidBeforeProcessing(validateKpiSnapshot(snapshot));
  }

  return buildKpiOverview(snapshots);
}