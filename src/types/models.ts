export const CLINICS = [
  {
    name: "HealthCore Austin Central",
    city: "Austin",
    state: "TX",
    phone: "+1-512-340-8800",
    openingHours: { weekdays: { opensAt: "07:00", closesAt: "20:00" }, saturday: { opensAt: "09:00", closesAt: "15:00" } }
  },
  {
    name: "HealthCore Austin North",
    city: "Austin",
    state: "TX",
    phone: "+1-512-340-8810",
    openingHours: { weekdays: { opensAt: "08:00", closesAt: "19:00" } }
  },
  {
    name: "HealthCore San Antonio",
    city: "San Antonio",
    state: "TX",
    phone: "+1-210-720-4400",
    openingHours: { weekdays: { opensAt: "08:00", closesAt: "18:00" }, saturday: { opensAt: "09:00", closesAt: "13:00" } }
  },
  {
    name: "HealthCore Miami",
    city: "Miami",
    state: "FL",
    phone: "+1-305-510-7700",
    openingHours: { weekdays: { opensAt: "07:00", closesAt: "20:00" }, saturday: { opensAt: "09:00", closesAt: "16:00" } }
  },
  {
    name: "HealthCore Orlando",
    city: "Orlando",
    state: "FL",
    phone: "+1-407-892-6600",
    openingHours: { weekdays: { opensAt: "08:00", closesAt: "18:00" } }
  },
  {
    name: "HealthCore Atlanta",
    city: "Atlanta",
    state: "GA",
    phone: "+1-404-330-9900",
    openingHours: { weekdays: { opensAt: "08:00", closesAt: "19:00" } }
  }
] as const satisfies readonly Clinic[];

export interface DailyHours {
  readonly opensAt: string;
  readonly closesAt: string;
}

export interface Clinic {
  readonly name: string;
  readonly city: string;
  readonly state: "TX" | "FL" | "GA";
  readonly phone: string;
  readonly openingHours: {
    readonly weekdays: DailyHours;
    readonly saturday?: DailyHours;
  };
}

export type ClinicName = (typeof CLINICS)[number]["name"];

export const SERVICE_TYPES = [
  "Primary Care",
  "Chronic Disease Management",
  "Specialist Consultation",
  "Preventive Health",
  "Women's Health",
  "Paediatric Care",
  "Mental Health"
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];
export type PreferredLanguage = "English" | "Spanish";
export type PreferredTime = "morning" | "afternoon" | "evening";
export type YesNo = "yes" | "no";
export type ValidationLanguage = "en" | "es";

export interface PatientEnquiry {
  readonly first_name: string;
  readonly last_name: string;
  readonly date_of_birth: string;
  readonly email: string;
  readonly phone: string;
  readonly preferred_language: PreferredLanguage | "";
  readonly preferred_clinic: ClinicName | "";
  readonly preferred_date: string;
  readonly preferred_time: PreferredTime | "";
  readonly service_type: ServiceType | "";
  readonly new_patient: YesNo | "";
  readonly has_insurance: YesNo | "";
  readonly insurance_provider?: string;
  readonly insurance_member_id?: string;
  readonly patient_id?: string;
  readonly health_concern: string;
  readonly contact_consent: boolean;
}

export type PatientEnquiryField = keyof PatientEnquiry;
