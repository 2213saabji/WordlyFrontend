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
  /** When the guide's content last changed (YYYY-MM-DD) — shown on the page
   * and used as its sitemap lastmod, so bump it only for real revisions. */
  updated: string;
}

export const GUIDES_PATH = "/guides";

export const GUIDES: Guide[] = [
  {
    slug: "best-starting-words",
    title: "The best starting words, tested on our word list",
    description:
      "We scored every five-letter opener against all 5,028 GuessWord answers. Here's what works for Daily, Infinite and guest play — and why ADIEU doesn't.",
    readMinutes: 6,
    updated: "2026-10-07",
  },
  {
    slug: "letter-frequency",
    title: "Letter frequency in GuessWord answers",
    description:
      "Which letters show up most, where they sit in the word, and how the Daily, Infinite and guest word lists differ — with the full numbers.",
    readMinutes: 5,
    updated: "2026-10-07",
  },
  {
    slug: "word-patterns",
    title: "Five-letter word patterns: endings, doubles and vowels",
    description:
      "One answer in three repeats a letter. Most have exactly two vowels. Learn the patterns that turn a stuck board into a solve.",
    readMinutes: 6,
    updated: "2026-10-18",
  },
  {
    slug: "5-letter-words-with-lots-of-vowels",
    title: "5-letter words with lots of vowels: the full list",
    description:
      "Every five-letter answer with three or four vowels, the words with none, where vowels sit — and whether vowel-heavy openers like ADIEU actually help.",
    readMinutes: 6,
    updated: "2026-10-18",
  },
  {
    slug: "5-letter-words-with-double-letters",
    title: "5-letter words with double letters: the full list",
    description:
      "All 313 five-letter answers with a double letter, grouped by pair from OO to ZZ, plus where doubles sit, palindromes, and when to guess a repeat.",
    readMinutes: 6,
    updated: "2026-10-18",
  },
  {
    slug: "solving-strategy",
    title: "How to solve in four guesses or fewer",
    description:
      "A step-by-step method for reading the tiles, choosing your second word, handling repeated letters and knowing when to use a hint.",
    readMinutes: 7,
    updated: "2026-10-07",
  },
  {
    slug: "infinite-tiers",
    title: "Climbing the Infinite tiers: a practical guide",
    description:
      "How points, daily targets, day counts and demotion windows really work — with a worked example of a week from Stone upward.",
    readMinutes: 7,
    updated: "2026-10-07",
  },
  {
    slug: "playing-with-friends",
    title: "Playing GuessWord with friends and groups",
    description:
      "Set up a group, share the invite code, read the daily and weekly boards, and share results without spoiling the word.",
    readMinutes: 5,
    updated: "2026-10-07",
  },
  {
    slug: "guess-word-games",
    title: "Guess word games: best free word guessing games",
    description:
      "Guess word games compared: GuessWord, Wordle, Quordle, Octordle, Absurdle, Contexto, Semantle and Dordle — what each does well and which to play.",
    readMinutes: 5,
    updated: "2026-11-01",
  },
];

/** The newest guide revision — the hub's "updated" date and sitemap lastmod. */
export const GUIDES_UPDATED_ISO = GUIDES.map((g) => g.updated).sort().at(-1)!;

/** "2026-10-07" → "7 October 2026". */
export function formatGuideDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function guidePath(slug: string): string {
  return `${GUIDES_PATH}/${slug}`;
}

export function guideBySlug(slug: string): Guide {
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) throw new Error(`Unknown guide: ${slug}`);
  return guide;
}
