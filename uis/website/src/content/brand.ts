export const brand = {
  name: "Brasaland",
  tagline: "Grilled food that tastes the same in Medellín and Miami.",
  founded: 2008,
  hq: "Medellín, Colombia",
  miamiOffice: "Miami, Florida",
  locations: 14,
  employees: 115,
  markets: ["Colombia", "Florida (US)"],
  currencies: ["COP", "USD"],
  commitments: [
    {
      title: "Same taste everywhere",
      body: "A Brasaland plate in Medellín matches the one in Miami — recipes and presentation stay consistent across all 14 kitchens.",
    },
    {
      title: "Warm, consistent service",
      body: "Guests feel the same welcome whether they walk into a Colombia location or a Florida dining room.",
    },
    {
      title: "A kitchen that moves fast",
      body: "Speed without shortcuts: the grill line is built for rush hour without losing quality.",
    },
  ],
  loyalty: {
    name: "Brasa Points",
    status:
      "Today Brasa Points still runs on physical stamp cards. Brasaland Digital is building the digital loyalty experience Camila Ospina’s team needs.",
  },
  ceo: "Mariana Restrepo",
} as const;
