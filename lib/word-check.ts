const SALT = process.env.NEXT_PUBLIC_WORD_HASH_SALT ?? "";

// The hashed word lists (lib/word-hashes.ts, ~330 KB) are loaded on demand
// rather than imported statically: a static import put them in the first
// page's bundle, so every visitor downloaded them before even the sign-in
// screen could render. PlayScreen calls preloadWordLists() on mount so the
// first guess doesn't wait on the download.
interface WordSets {
  answers: Set<string>;
  infiniteAnswers: Set<string>;
  extra: Set<string>;
}

let setsPromise: Promise<WordSets> | null = null;

function loadWordSets(): Promise<WordSets> {
  if (!setsPromise) {
    setsPromise = import("@/lib/word-hashes")
      .then(({ ANSWERS_HASHES, INFINITE_ANSWERS_HASHES, EXTRA_VALID_GUESS_HASHES }) => ({
        answers: new Set(ANSWERS_HASHES),
        infiniteAnswers: new Set(INFINITE_ANSWERS_HASHES),
        extra: new Set(EXTRA_VALID_GUESS_HASHES),
      }))
      .catch((err) => {
        // Let a later call retry (e.g. after a dropped connection).
        setsPromise = null;
        throw err;
      });
  }
  return setsPromise;
}

/** Starts downloading the word lists in the background. Safe to call
 * repeatedly; failures are left for isKnownGuess to handle. */
export function preloadWordLists(): void {
  loadWordSets().catch(() => {});
}

async function hashWord(word: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${SALT}:${word.toLowerCase()}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Client-side pre-check, run before a guess ever reaches the backend.
 *
 * Mirrors the backend's shared VALID_GUESS_SET (ANSWERS_HASHES ∪
 * INFINITE_ANSWERS_HASHES ∪ EXTRA_VALID_GUESS_HASHES) — guess validation is
 * not mode-scoped, in either the backend or here: a word from either
 * answer pool, or the extra guess list, is accepted regardless of which
 * mode is being played (e.g. an infinite-only answer like "hippy" is a
 * valid daily guess too). `mode` only decides which of the three sets gets
 * checked first, as a cheap ordering optimization — the result is the same
 * union check either way. Only a guess unrecognized in *all three* lists is
 * treated as definitely-not-a-word and never reaches the API at all.
 *
 * If the lists can't be loaded (offline, blocked chunk), the guess is let
 * through — the backend stays the final authority.
 */
export async function isKnownGuess(word: string, mode: "daily" | "infinite"): Promise<boolean> {
  let sets: WordSets;
  try {
    sets = await loadWordSets();
  } catch {
    return true;
  }
  const hash = await hashWord(word);
  const { answers, infiniteAnswers, extra } = sets;

  if (mode === "daily") {
    if (answers.has(hash) || extra.has(hash)) return true;
    return infiniteAnswers.has(hash);
  }

  if (infiniteAnswers.has(hash) || extra.has(hash)) return true;
  return answers.has(hash);
}
