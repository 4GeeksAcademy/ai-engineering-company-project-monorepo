import * as utils from "./utils";
import { appointments, claims, clinicians, locations } from "../tests/utils/fixtures";

type InputValue =
  | string | number | boolean | null | undefined
  | InputValue[]
  | { [key: string]: InputValue }
  | Claim | Claim[] | Appointment | Appointment[]
  | Clinician | Clinician[] | ClinicLocation | FilterType;

export type FunctionRunnerInput = { [key: string]: InputValue };

export type UtilityResult =
  | Claim[] | Appointment[] | Clinician[] | CMEReport[]
  | Claim | Clinician | ValidationResult
  | Record<string, Claim[]> | Record<string, number>
  | number | string[] | boolean | null;

function castInput<T>(value: InputValue | undefined): T {
  return value as unknown as T;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export type UtilityLang = "en" | "es";

type FunctionConfig = {
  hint: Record<UtilityLang, string>;
  template: FunctionRunnerInput;
  run: (input: FunctionRunnerInput) => UtilityResult;
};

export const utilityFunctionCatalog: Record<string, FunctionConfig> = {
  filterClaims: {
    hint: {
      en: '{ "claims": [...], "filters": { "payerName": "BlueCross" } }',
      es: '{ "claims": [...], "filters": { "payerName": "BlueCross" } }',
    },
    template: { claims: [], filters: { payerName: "BlueCross" } },
    run: (input) => utils.filterClaims(castInput(input.claims), castInput(input.filters)),
  },
  filterAppointmentsByStatus: {
    hint: {
      en: '{ "appointments": [...], "status": ["no_show", "completed"] }',
      es: '{ "appointments": [...], "status": ["no_show", "completed"] }',
    },
    template: { appointments: [], status: ["no_show", "completed"] },
    run: (input) => utils.filterAppointmentsByStatus(castInput(input.appointments), castInput(input.status)),
  },
  sortClaimsById: {
    hint: {
      en: '{ "claims": [...], "direction": "asc" }',
      es: '{ "claims": [...], "direction": "asc" }',
    },
    template: { claims: [], direction: "asc" },
    run: (input) => utils.sortClaimsById(castInput(input.claims), castInput(input.direction)),
  },
  sortAppointmentsByDate: {
    hint: {
      en: '{ "appointments": [...], "direction": "asc" }',
      es: '{ "appointments": [...], "direction": "asc" }',
    },
    template: { appointments: [], direction: "asc" },
    run: (input) => utils.sortAppointmentsByDate(castInput(input.appointments), castInput(input.direction)),
  },
  groupClaimsBy: {
    hint: {
      en: '{ "claims": [...], "key": "payerName" }',
      es: '{ "claims": [...], "key": "payerName" }',
    },
    template: { claims: [], key: "payerName" },
    run: (input) => utils.groupClaimsBy(castInput(input.claims), castInput(input.key)),
  },
  findClaimById: {
    hint: {
      en: '{ "claims": [...], "claimId": "CLM-000001" }',
      es: '{ "claims": [...], "claimId": "CLM-000001" }',
    },
    template: { claims: [], claimId: "CLM-000001" },
    run: (input) => utils.findClaimById(castInput(input.claims), castInput(input.claimId)),
  },
  findClinicianById: {
    hint: {
      en: '{ "clinicians": [...], "clinicianId": "CLN-000001" }',
      es: '{ "clinicians": [...], "clinicianId": "CLN-000001" }',
    },
    template: { clinicians: [], clinicianId: "CLN-000001" },
    run: (input) => utils.findClinicianById(castInput(input.clinicians), castInput(input.clinicianId)),
  },
  binarySearchClaimById: {
    hint: {
      en: '{ "sortedClaims": [...], "targetId": "CLM-000001" }',
      es: '{ "sortedClaims": [...], "targetId": "CLM-000001" }',
    },
    template: { sortedClaims: [], targetId: "CLM-000001" },
    run: (input) => utils.binarySearchClaimById(castInput(input.sortedClaims), castInput(input.targetId)),
  },
  calculateDenialRate: {
    hint: { en: '{ "claims": [...] }', es: '{ "claims": [...] }' },
    template: { claims: [] },
    run: (input) => utils.calculateDenialRate(castInput(input.claims)),
  },
  denialRateByPayer: {
    hint: { en: '{ "claims": [...] }', es: '{ "claims": [...] }' },
    template: { claims: [] },
    run: (input) => utils.denialRateByPayer(castInput(input.claims)),
  },
  denialRateByLocation: {
    hint: { en: '{ "claims": [...] }', es: '{ "claims": [...] }' },
    template: { claims: [] },
    run: (input) => utils.denialRateByLocation(castInput(input.claims)),
  },
  flagHighDenialPayers: {
    hint: { en: '{ "claims": [...], "threshold": 8 }', es: '{ "claims": [...], "threshold": 8 }' },
    template: { claims: [], threshold: 8 },
    run: (input) => utils.flagHighDenialPayers(castInput(input.claims), castInput(input.threshold)),
  },
  calculateNoShowCost: {
    hint: {
      en: '{ "appointments": [...], "location": {...}, "weekEndingDate": "2025-03-11" }',
      es: '{ "appointments": [...], "location": {...}, "weekEndingDate": "2025-03-11" }',
    },
    template: {
      appointments: [],
      location: {
        locationId: "us-tx-001",
        name: "HealthCore Austin Central",
        city: "Austin",
        stateOrCountry: "TX",
        country: "US",
        phone: "(512) 340-8800",
        averageConsultationFee: {
          primary_care: 180,
          chronic_disease: 220,
          preventive: 150,
          specialist: 320,
          womens_health: 240,
          paediatric: 175,
          mental_health: 200,
        },
      },
      weekEndingDate: "2025-03-11",
    },
    run: (input) =>
      utils.calculateNoShowCost(castInput(input.appointments), castInput(input.location), castInput(input.weekEndingDate)),
  },
  noShowRateByLocation: {
    hint: { en: '{ "appointments": [...] }', es: '{ "appointments": [...] }' },
    template: { appointments: [] },
    run: (input) => utils.noShowRateByLocation(castInput(input.appointments)),
  },
  flagHighNoShowLocations: {
    hint: { en: '{ "appointments": [...], "threshold": 20 }', es: '{ "appointments": [...], "threshold": 20 }' },
    template: { appointments: [], threshold: 20 },
    run: (input) => utils.flagHighNoShowLocations(castInput(input.appointments), castInput(input.threshold)),
  },
  generateCMEReport: {
    hint: { en: '{ "clinicians": [...], "asOfDate": "2025-06-30" }', es: '{ "clinicians": [...], "asOfDate": "2025-06-30" }' },
    template: { clinicians: [], asOfDate: "2025-06-30" },
    run: (input) => utils.generateCMEReport(castInput(input.clinicians), castInput(input.asOfDate)),
  },
  getCliniciansAtRisk: {
    hint: { en: '{ "clinicians": [...], "asOfDate": "2025-06-30" }', es: '{ "clinicians": [...], "asOfDate": "2025-06-30" }' },
    template: { clinicians: [], asOfDate: "2025-06-30" },
    run: (input) => utils.getCliniciansAtRisk(castInput(input.clinicians), castInput(input.asOfDate)),
  },
  getCliniciansWithExpiringLicences: {
    hint: { en: '{ "clinicians": [...], "asOfDate": "2025-06-30", "daysThreshold": 45 }', es: '{ "clinicians": [...], "asOfDate": "2025-06-30", "daysThreshold": 45 }' },
    template: { clinicians: [], asOfDate: "2025-06-30", daysThreshold: 45 },
    run: (input) =>
      utils.getCliniciansWithExpiringLicences(castInput(input.clinicians), castInput(input.asOfDate), castInput(input.daysThreshold)),
  },
  validateClaim: {
    hint: { en: '{ "claim": {...}, "knownLocationIds": ["us-tx-001", "us-fl-001"] }', es: '{ "claim": {...}, "knownLocationIds": ["us-tx-001", "us-fl-001"] }' },
    template: {
      claim: {
        claimId: "CLM-000001",
        patientId: "HC-A3F291",
        locationId: "us-tx-001",
        serviceType: "primary_care",
        payerName: "BlueCross",
        payerId: "BC001",
        submissionDate: "2025-03-10",
        claimAmount: 180,
        status: "approved",
        resubmitted: false,
      },
      knownLocationIds: ["us-tx-001", "us-fl-001"],
    },
    run: (input) => utils.validateClaim(castInput(input.claim), castInput(input.knownLocationIds)),
  },
  validateClinician: {
    hint: { en: '{ "clinician": {...} }', es: '{ "clinician": {...} }' },
    template: {
      clinician: {
        clinicianId: "CLN-000001",
        firstName: "Marcus",
        lastName: "Reid",
        role: "physician",
        locationId: "us-tx-001",
        licenceState: "TX",
        licenceExpiryDate: "2026-06-30",
        cmeHoursRequired: 40,
        cmeHoursLogged: 28,
        cmeYearStartDate: "2025-01-01",
      },
    },
    run: (input) => utils.validateClinician(castInput(input.clinician)),
  },
  isDenialRateAboveThreshold: {
    hint: { en: '{ "rate": 9.2, "threshold": 8 }', es: '{ "rate": 9.2, "threshold": 8 }' },
    template: { rate: 9.2, threshold: 8 },
    run: (input) => utils.isDenialRateAboveThreshold(castInput(input.rate), castInput(input.threshold)),
  },
  isNoShowRateAboveThreshold: {
    hint: { en: '{ "rate": 21, "threshold": 20 }', es: '{ "rate": 21, "threshold": 20 }' },
    template: { rate: 21, threshold: 20 },
    run: (input) => utils.isNoShowRateAboveThreshold(castInput(input.rate), castInput(input.threshold)),
  },
};

const fixtureTemplates: Record<string, FunctionRunnerInput> = {
  filterClaims: {
    claims: clone(claims),
    filters: { payerName: "BlueCross" },
  },
  filterAppointmentsByStatus: {
    appointments: clone(appointments),
    status: ["no_show", "completed"],
  },
  sortClaimsById: {
    claims: clone(claims),
    direction: "asc",
  },
  sortAppointmentsByDate: {
    appointments: clone(appointments),
    direction: "asc",
  },
  groupClaimsBy: {
    claims: clone(claims),
    key: "payerName",
  },
  findClaimById: {
    claims: clone(claims),
    claimId: claims[1]?.claimId,
  },
  findClinicianById: {
    clinicians: clone(clinicians),
    clinicianId: clinicians[0]?.clinicianId,
  },
  binarySearchClaimById: {
    sortedClaims: clone(utils.sortClaimsById(claims, "asc")),
    targetId: claims[2]?.claimId,
  },
  calculateDenialRate: {
    claims: clone(claims),
  },
  denialRateByPayer: {
    claims: clone(claims),
  },
  denialRateByLocation: {
    claims: clone(claims),
  },
  flagHighDenialPayers: {
    claims: clone(claims),
    threshold: 40,
  },
  calculateNoShowCost: {
    appointments: clone(appointments),
    location: clone(locations[0]),
    weekEndingDate: "2025-03-12",
  },
  noShowRateByLocation: {
    appointments: clone(appointments),
  },
  flagHighNoShowLocations: {
    appointments: clone(appointments),
    threshold: 70,
  },
  generateCMEReport: {
    clinicians: clone(clinicians),
    asOfDate: "2025-06-15",
  },
  getCliniciansAtRisk: {
    clinicians: clone(clinicians),
    asOfDate: "2025-12-15",
  },
  getCliniciansWithExpiringLicences: {
    clinicians: clone(clinicians),
    asOfDate: "2025-06-15",
    daysThreshold: 30,
  },
  validateClaim: {
    claim: clone(claims[1]),
    knownLocationIds: locations.map((location) => location.locationId),
  },
  validateClinician: {
    clinician: clone(clinicians[0]),
  },
  isDenialRateAboveThreshold: {
    rate: 9.2,
    threshold: 8,
  },
  isNoShowRateAboveThreshold: {
    rate: 21,
    threshold: 20,
  },
};

Object.entries(fixtureTemplates).forEach(([functionName, template]) => {
  if (utilityFunctionCatalog[functionName]) {
    utilityFunctionCatalog[functionName].template = template;
  }
});


export const utilityFunctionNames = Object.keys(utilityFunctionCatalog);

export function getUtilityTemplate(name: string): FunctionRunnerInput | undefined {
  return utilityFunctionCatalog[name]?.template;
}

export function getUtilityHint(name: string, lang: UtilityLang): string | undefined {
  return utilityFunctionCatalog[name]?.hint[lang];
}

export function runUtilityFunction(name: string, input: FunctionRunnerInput): UtilityResult {
  const config = utilityFunctionCatalog[name];
  if (!config) throw new Error(`Unknown utility function: ${name}`);
  return config.run(input);
}

export function stringifyUtilityResult(value: UtilityResult): string {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
