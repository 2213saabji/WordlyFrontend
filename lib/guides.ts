// The /guides section: one entry per guide page, used by the guides hub,
// the "More guides" links at the end of each guide, the site header/footer
// and the sitemap. Add a guide here when you add its page.
//
// The numbers quoted in the guides come from GuessWord's own word lists
// (backend data/words.js: the Daily, Infinite and guest answer pools) —
// re-run the analysis and update the copy if those lists change.

export interface Guide {
  slug: string;
  title: string;
  /** One line for the hub card and the page's meta description. */
  description: string;
  readMinutes: number;
}

export const GUIDES_PATH = "/guides";

/** Shown on every guide; bump it when a guide's content is revised. */
export const GUIDES_UPDATED = "7 October 2026";
export const GUIDES_UPDATED_ISO = "2026-10-07";

export const GUIDES: Guide[] = [
  {
    slug: "best-starting-words",
    title: "The best starting words, tested on our word list",
    description:
      "We scored every five-letter opener against all 5,028 GuessWord answers. Here's what works for Daily, Infinite and guest play — and why ADIEU doesn't.",
    readMinutes: 6,
  },
  {
    slug: "letter-frequency",
    title: "Letter frequency in GuessWord answers",
    description:
      "Which letters show up most, where they sit in the word, and how the Daily, Infinite and guest word lists differ — with the full numbers.",
    readMinutes: 5,
  },
  {
    slug: "word-patterns",
    title: "Five-letter word patterns: endings, doubles and vowels",
    description:
      "One answer in three repeats a letter. Most have exactly two vowels. Learn the patterns that turn a stuck board into a solve.",
    readMinutes: 6,
  },
  {
    slug: "solving-strategy",
    title: "How to solve in four guesses or fewer",
    description:
      "A step-by-step method for reading the tiles, choosing your second word, handling repeated letters and knowing when to use a hint.",
    readMinutes: 7,
  },
  {
    slug: "infinite-tiers",
    title: "Climbing the Infinite tiers: a practical guide",
    description:
      "How points, daily targets, day counts and demotion windows really work — with a worked example of a week from Stone upward.",
    readMinutes: 7,
  },
  {
    slug: "playing-with-friends",
    title: "Playing GuessWord with friends and groups",
    description:
      "Set up a group, share the invite code, read the daily and weekly boards, and share results without spoiling the word.",
    readMinutes: 5,
  },
];

export function guidePath(slug: string): string {
  return `${GUIDES_PATH}/${slug}`;
}

export function guideBySlug(slug: string): Guide {
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) throw new Error(`Unknown guide: ${slug}`);
  return guide;
}
