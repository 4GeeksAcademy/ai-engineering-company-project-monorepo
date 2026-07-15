export type MenuItem = {
  title: string;
  description: string;
  image: string;
  accent: "red" | "gold" | "orange";
  tag?: string;
};

export type LocationItem = {
  city: string;
  address: string;
  flag: string;
};
