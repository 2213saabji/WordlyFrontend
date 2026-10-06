import type { MetadataRoute } from "next";
import { GUIDES, GUIDES_PATH, GUIDES_UPDATED_ISO, guidePath } from "@/lib/guides";

const SITE_URL = "https://www.guessword.games";

// The rest of the app is client-side "screens" behind "/" (the guest home
// for visitors, the signed-in app once logged in), not separate server
// pages. /reset-password/[token] is deliberately
// excluded, since each link is single-use and tied to one person's reset
// request, not a page worth search engines indexing.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: SITE_URL, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/how-to-play`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/faq`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy-policy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    // Public Infinite tier board.
    { url: `${SITE_URL}/leaderboard/infinite`, lastModified, changeFrequency: "daily", priority: 0.6 },
    // Strategy guides (lib/guides.ts).
    { url: `${SITE_URL}${GUIDES_PATH}`, lastModified: GUIDES_UPDATED_ISO, changeFrequency: "monthly", priority: 0.8 },
    ...GUIDES.map((guide) => ({
      url: `${SITE_URL}${guidePath(guide.slug)}`,
      lastModified: GUIDES_UPDATED_ISO,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
