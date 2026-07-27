import {
  calculateDenialRate,
  denialRateByPayer,
  flagHighDenialPayers,
  noShowRateByLocation,
  flagHighNoShowLocations,
  generateCMEReport,
  getCliniciansAtRisk,
} from "@healthcore/utils";
import { appointments, claims, clinicians, locations } from "@healthcore/fixtures";

const AS_OF_DATE = "2025-06-30";

const locationNames: Record<string, string> = Object.fromEntries(
  locations.map((l) => [l.locationId, l.name])
);

const cmeStatusLabels: Record<string, string> = {
  on_track: "On track",
  at_risk: "At risk",
  overdue: "Overdue",
  complete: "Complete",
};

export function getOperationsSnapshot() {
  const overallDenial = calculateDenialRate(claims);
  const payerRates = denialRateByPayer(claims);
  const flaggedPayers = flagHighDenialPayers(claims);
  const noShowRates = noShowRateByLocation(appointments);
  const flaggedLocations = flagHighNoShowLocations(appointments);
  const cmeReport = generateCMEReport(clinicians, AS_OF_DATE);
  const atRisk = getCliniciansAtRisk(clinicians, AS_OF_DATE);

  return {
    asOfDate: AS_OF_DATE,
    billing: { overallDenial, payerRates, flaggedPayers },
    clinical: { noShowRates, flaggedLocations },
    people: { cmeReport, atRisk },
    locationNames,
    cmeStatusLabels,
  };
}

export type OperationsSnapshot = ReturnType<typeof getOperationsSnapshot>;
