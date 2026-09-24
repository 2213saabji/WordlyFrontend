import type { MetadataRoute } from "next";

// The rest of the app is client-side "screens" behind one route, not
// separate server pages — /reset-password/[token] is deliberately excluded,
// since each link is single-use and tied to one person's reset request, not
// a page worth search engines indexing.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.guessword.games",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
