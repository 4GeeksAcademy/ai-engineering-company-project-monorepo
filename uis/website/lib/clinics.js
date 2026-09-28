/**
 * @typedef {import("./i18n").TranslationKey} TranslationKey
 * @typedef {{
 *   name: string;
 *   city: string;
 *   state: string;
 *   phone: string;
 *   tel: string;
 *   hoursKey: TranslationKey;
 *   openingHours: string;
 *   featured: boolean;
 *   eveningWarningKey?: TranslationKey;
 * }} Clinic
 */

/** @type {Clinic[]} */
export const clinics = [
  { name: "HealthCore Austin Central", city: "Austin, TX", state: "TX", phone: "(512) 340-8800", tel: "+15123408800", hoursKey: "locations.austincentral.hours", openingHours: "Mo-Fr 07:00-20:00 Sa 09:00-15:00", featured: true },
  { name: "HealthCore Austin North", city: "Austin, TX", state: "TX", phone: "(512) 340-8810", tel: "+15123408810", hoursKey: "locations.austinnorth.hours", openingHours: "Mo-Fr 08:00-19:00", featured: false, eveningWarningKey: "warning.austin_north" },
  { name: "HealthCore San Antonio", city: "San Antonio, TX", state: "TX", phone: "(210) 720-4400", tel: "+12107204400", hoursKey: "locations.sanantonio.hours", openingHours: "Mo-Fr 08:00-18:00 Sa 09:00-13:00", featured: false, eveningWarningKey: "warning.san_antonio" },
  { name: "HealthCore Miami", city: "Miami, FL", state: "FL", phone: "(305) 510-7700", tel: "+13055107700", hoursKey: "locations.miami.hours", openingHours: "Mo-Fr 07:00-20:00 Sa 09:00-16:00", featured: true },
  { name: "HealthCore Orlando", city: "Orlando, FL", state: "FL", phone: "(407) 892-6600", tel: "+14078926600", hoursKey: "locations.orlando.hours", openingHours: "Mo-Fr 08:00-18:00", featured: false },
  { name: "HealthCore Atlanta", city: "Atlanta, GA", state: "GA", phone: "(404) 330-9900", tel: "+14043309900", hoursKey: "locations.atlanta.hours", openingHours: "Mo-Fr 08:00-19:00", featured: false },
];
