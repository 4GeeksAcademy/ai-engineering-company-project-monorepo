export const appUrls = {
  website: process.env.NEXT_PUBLIC_WEBSITE_URL ?? "http://localhost:3000",
  backoffice: process.env.NEXT_PUBLIC_BACKOFFICE_URL ?? "http://localhost:3001",
  tracker: process.env.NEXT_PUBLIC_TRACKER_URL ?? "http://localhost:3002",
} as const;
