import type { MetadataRoute } from "next";
import { GUIDES, GUIDES_PATH, GUIDES_UPDATED_ISO, guidePath } from "@/lib/guides";

const SITE_URL = "https://www.guessword.games";

// When the content of the info pages (how to play, about, FAQ, contact,
// legal) last changed. Bump it when you edit their copy. Google only trusts
// <lastmod> when it's accurate, so a value that changes on every deploy gets
// ignored for the whole sitemap.
const INFO_PAGES_UPDATED_ISO = "2026-10-18";
// Same rule for the home page's own copy (title, description, headline and
// the intro in app/(game)/page.tsx).
const HOME_UPDATED_ISO = "2026-11-01";

// The rest of the app is client-side "screens" behind "/" (the guest home
// for visitors, the signed-in app once logged in), not separate server
// pages. /reset-password/[token] is deliberately
// excluded, since each link is single-use and tied to one person's reset
// request, not a page worth search engines indexing.
export default function sitemap(): MetadataRoute.Sitemap {
  const info = (path: string, priority: number, changeFrequency: "monthly" | "yearly") => ({
    url: `${SITE_URL}${path}`,
    lastModified: INFO_PAGES_UPDATED_ISO,
    changeFrequency,
    priority,
  });

  return [
    { url: SITE_URL, lastModified: HOME_UPDATED_ISO, changeFrequency: "daily", priority: 1 },
    info("/how-to-play", 0.8, "monthly"),
    info("/about", 0.6, "monthly"),
    info("/faq", 0.7, "monthly"),
    info("/contact", 0.3, "yearly"),
    info("/privacy-policy", 0.3, "yearly"),
    info("/terms", 0.3, "yearly"),
    info("/refund-policy", 0.3, "yearly"),
    // Public Infinite tier board — its standings really do change daily.
    { url: `${SITE_URL}/leaderboard/infinite`, lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
    // Strategy guides (lib/guides.ts).
    { url: `${SITE_URL}${GUIDES_PATH}`, lastModified: GUIDES_UPDATED_ISO, changeFrequency: "monthly", priority: 0.8 },
    ...GUIDES.map((guide) => ({
      url: `${SITE_URL}${guidePath(guide.slug)}`,
      lastModified: guide.updated,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
