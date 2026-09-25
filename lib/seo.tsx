import type { Metadata } from "next";

export const SITE_URL = "https://www.guessword.games";
export const SITE_NAME = "GuessWord";

// app/opengraph-image.tsx only attaches itself to the root segment — a page
// that sets its own `openGraph`/`twitter` replaces the whole object
// (metadata merges shallowly), so the image has to be re-listed here or
// every info page would share without a preview image.
const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "GuessWord — Free Daily Word Guessing Game",
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

export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // `<` escaped so a string in the data can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
