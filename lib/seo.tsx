import type { Metadata } from "next";

export const SITE_URL = "https://www.guessword.games";
export const SITE_NAME = "GuessWord";
/** The home page's <title> — also the share image's alt text. */
export const HOME_TITLE = "GuessWord: Free Guess Word Game | Daily & Unlimited";

// app/opengraph-image.tsx only attaches itself to the root segment — a page
// that sets its own `openGraph`/`twitter` replaces the whole object
// (metadata merges shallowly), so the image has to be re-listed here or
// every info page would share without a preview image.
const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: HOME_TITLE,
};

/** Per-page metadata for a public, indexable route. Sets a self-referencing
 * canonical and page-specific Open Graph/Twitter tags — without these, each
 * page would inherit the root layout's `canonical: "/"` and home-page OG
 * tags, telling search engines every page is a duplicate of the home page. */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const fullTitle = `${title} · ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

/** schema.org BreadcrumbList for Home → page, so search results can show the
 * site hierarchy instead of a bare URL. */
export function breadcrumbJsonLd(name: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name, item: `${SITE_URL}${path}` },
    ],
  };
}

/** Same as breadcrumbJsonLd, for deeper pages: Home → each of `trail`
 * (e.g. Guides → one guide). */
export function breadcrumbTrailJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      ...trail.map((step, i) => ({ "@type": "ListItem", position: i + 2, name: step.name, item: `${SITE_URL}${step.path}` })),
    ],
  };
}

/** schema.org Article for a guide page. */
export function articleJsonLd({
  title,
  description,
  path,
  dateModified,
}: {
  title: string;
  description: string;
  path: string;
  /** ISO date (YYYY-MM-DD). */
  dateModified: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: `${SITE_URL}${path}`,
    image: `${SITE_URL}${OG_IMAGE.url}`,
    // Google flags a bare date as invalid for Article — it wants a full
    // datetime with a time zone (start of that day, IST).
    dateModified: `${dateModified}T00:00:00+05:30`,
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#game` },
  };
}

export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // `<` escaped so a string in the data can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
