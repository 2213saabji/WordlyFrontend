import { ANSWERS_HASHES, INFINITE_ANSWERS_HASHES, EXTRA_VALID_GUESS_HASHES } from "@/lib/word-hashes";

const SALT = process.env.NEXT_PUBLIC_WORD_HASH_SALT ?? "";

let answersSet: Set<string> | null = null;
let infiniteAnswersSet: Set<string> | null = null;
let extraSet: Set<string> | null = null;

function getAnswersSet(): Set<string> {
  if (!answersSet) answersSet = new Set(ANSWERS_HASHES);
  return answersSet;
}

function getInfiniteAnswersSet(): Set<string> {
  if (!infiniteAnswersSet) infiniteAnswersSet = new Set(INFINITE_ANSWERS_HASHES);
  return infiniteAnswersSet;
}

function getExtraSet(): Set<string> {
  if (!extraSet) extraSet = new Set(EXTRA_VALID_GUESS_HASHES);
  return extraSet;
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
 */
export async function isKnownGuess(word: string, mode: "daily" | "infinite"): Promise<boolean> {
  const hash = await hashWord(word);
  const answers = getAnswersSet();
  const infiniteAnswers = getInfiniteAnswersSet();
  const extra = getExtraSet();

  if (mode === "daily") {
    if (answers.has(hash) || extra.has(hash)) return true;
    return infiniteAnswers.has(hash);
  }

  if (infiniteAnswers.has(hash) || extra.has(hash)) return true;
  return answers.has(hash);
}
