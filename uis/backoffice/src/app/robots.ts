import type { MetadataRoute } from "next";

// Internal tool: nothing here should appear in a search engine. (The pages are behind a login anyway; this also stops
// crawlers from spending requests on /login and /register.)
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
