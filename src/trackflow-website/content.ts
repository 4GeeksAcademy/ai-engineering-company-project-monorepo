export type NavLink = {
  label: string;
  href: string;
};

export type Feature = {
  title: string;
  description: string;
};

export const NAV_LINKS: NavLink[] = [
  { label: "Services", href: "#services" },
  { label: "Benefits", href: "#benefits" },
  { label: "Contact", href: "#contact" },
  { label: "Apply", href: "/application.html" },
];

export const CORE_STRENGTHS = [
  "Secure and scalable warehousing operations",
  "Inventory visibility with smooth fulfillment workflows",
  "Fast, reliable delivery across cities and regional markets",
];

export const FEATURES: Feature[] = [
  {
    title: "Reliable Warehousing",
    description:
      "Structured storage and handling workflows keep inventory protected and ready for rapid movement.",
  },
  {
    title: "End-to-End Fulfillment",
    description:
      "Integrated inventory management and order fulfillment reduce friction and improve delivery accuracy.",
  },
  {
    title: "On-Time Last-Mile Delivery",
    description:
      "Route optimization and regional market coverage improve delivery speed and consistency.",
  },
];