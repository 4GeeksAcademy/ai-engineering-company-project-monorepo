export const countryToCities: Record<string, string[]> = {
  Colombia: ["Medellin", "Bogota", "Cali"],
  "United States": ["Miami", "Orlando"],
};

export const locationMap: Record<string, string[]> = {
  "Colombia|Medellin": [
    "Brasaland El Poblado",
    "Brasaland Laureles",
    "Brasaland Envigado",
    "Brasaland Sabaneta",
  ],
  "Colombia|Bogota": [
    "Brasaland Usaquen",
    "Brasaland Chapinero",
    "Brasaland Zona Rosa",
  ],
  "Colombia|Cali": [
    "Brasaland Granada",
    "Brasaland Ciudad Jardin",
    "Brasaland Unicentro",
  ],
  "United States|Miami": ["Brasaland Brickell", "Brasaland Coral Gables"],
  "United States|Orlando": [
    "Brasaland Downtown",
    "Brasaland International Drive",
  ],
};

export const howFoundOptions = [
  "Social media",
  "Recommendation",
  "Walked by",
  "Internet search",
  "Other",
] as const;

export const dietOptions = [
  "No restrictions",
  "Vegetarian",
  "Gluten-free",
  "Other",
] as const;

export function getCitiesForCountry(country: string): string[] {
  return countryToCities[country] ?? [];
}

export function getLocationsForCountryCity(
  country: string,
  city: string,
): string[] {
  return locationMap[`${country}|${city}`] ?? [];
}
