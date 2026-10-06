import { Section, BulletList } from "@/components/ContentPage";
import { GuideLayout, GuideLink, P, StatTable, Strong, Walkthrough, guideMetadata } from "@/components/GuideParts";

const SLUG = "solving-strategy";

export const metadata = guideMetadata(SLUG);

// Simulated over all 5,028 answers: open with the given word, then always
// guess the remaining candidate that splits the rest best (October 2026).
const SIMULATION = [
  ["TARES", "4.06", "33.6%", "74.1%", "4.3%"],
  ["CRANE", "4.06", "31.9%", "75.2%", "4.2%"],
  ["ADIEU", "4.28", "26.0%", "68.5%", "6.3%"],
];

export default function SolvingStrategyPage() {
  return (
    <GuideLayout
      slug={SLUG}
      title={
        <>
          A method for <strong className="font-bold">every board.</strong>
        </>
      }
      intro="Good players aren't luckier — they follow a routine. This guide walks through one, guess by guess, and shows how to escape the trap that costs most players their last two rows."
    >
      <Section heading="What “good” looks like">
        <P>
          We simulated a careful player on every one of GuessWord&apos;s 5,028 possible answers: they open with a
          strong word, and from then on always guess one of the words that still fits the board, choosing the one
          that splits the remaining answers best.
        </P>
        <StatTable
          head={["Opener", "Average guesses", "In 3 or fewer", "In 4 or fewer", "Not solved in 6"]}
          rows={SIMULATION}
        />
        <P>
          So a realistic target is <Strong>solving in four guesses about three times out of four</Strong>, with
          an average just over four. Even a careful player misses around one word in 25 — usually because of the
          trap described below.
        </P>
      </Section>

      <Section heading="Guess 1: open with common letters">
        <P>
          Your first guess should test the letters that appear most often, in the positions they usually take. For
          the Daily word that means openers such as IRATE, ARISE or RAISE; for guest play, which is full of plurals,
          TALES or TARES. The <GuideLink href="/guides/best-starting-words">best starting words guide</GuideLink>{" "}
          has the full scores.
        </P>
      </Section>

      <Section heading="Guess 2: explore or exploit?">
        <P>Your second guess depends on how much the first one found:</P>
        <BulletList
          items={[
            <>
              <Strong>Zero or one coloured tile:</Strong> play five fresh letters. You don&apos;t know enough yet
              to aim at the answer, so gather information — after TARES, words such as BLOND, COULD or LOGIN cover
              the next most common letters.
            </>,
            <>
              <Strong>Two or more coloured tiles:</Strong> start using them. Keep each green in place, move each
              amber to a new spot, and fill the other slots with letters you haven&apos;t tested.
            </>,
          ]}
        />
        <P>
          Moving an amber letter matters: an amber tile tells you the letter is in the word <em>and</em> that this
          spot is wrong. Guessing it in the same place again wastes the information.
        </P>
      </Section>

      <Section heading="Read every tile, including the gray ones">
        <BulletList
          items={[
            "Green: right letter, right spot. Never move it.",
            "Amber: right letter, wrong spot. Note every spot it has already failed in.",
            "Gray: the letter isn't in the word — unless another copy of the same letter is coloured, in which case the answer just has fewer copies than you guessed.",
          ]}
        />
        <P>
          The keyboard dims gray letters for you, but it can&apos;t track where each amber letter has already been
          tried. Keep that in your head, or glance back up the board before every guess. The{" "}
          <GuideLink href="/guides/word-patterns">word patterns guide</GuideLink> explains repeated letters in
          detail.
        </P>
      </Section>

      <Section heading="The trap — and how to escape it">
        <P>
          The most common way to lose is to find four letters and still have several words that fit. Cycling
          through them one at a time can burn every remaining row. Here&apos;s an example of how to avoid it:
        </P>
        <Walkthrough
          steps={[
            {
              word: "raise",
              tones: "axxag",
              note: "R and S are in the word but misplaced; E is last. A and I are out.",
            },
            {
              word: "store",
              tones: "gxggg",
              note: (
                <>
                  Four greens: S_ORE. But SHORE, SNORE, SPORE, SWORE and SCORE all fit — five candidates and four
                  rows left.
                </>
              ),
            },
            {
              word: "punch",
              tones: "xxxxa",
              note: (
                <>
                  Instead of guessing one candidate, play a word that tests <Strong>P, N, C and H at once</Strong>.
                  It can&apos;t be the answer, but the amber H settles it.
                </>
              ),
            },
            { word: "shore", tones: "ggggg", note: "Solved in four, guaranteed — cycling could have taken six or more." },
          ]}
        />
        <P>
          The rule: when <Strong>three or more</Strong> candidates differ in just one letter, spend a guess on a
          word that contains as many of those differing letters as possible. It feels like wasting a row; it&apos;s
          the opposite.
        </P>
      </Section>

      <Section heading="When to use a hint">
        <P>
          Signed-in players get a hint after four guesses without a solve: a short clue about the word&apos;s
          meaning that never reveals the word itself. In Infinite mode hints are free in the Stone and Iron tiers,
          and cost 1,000 coins from Copper up. Hints aren&apos;t available when you play without logging in.
        </P>
        <P>
          A hint is most useful exactly in the trap above — when several words fit the letters, a clue about
          meaning picks the right one instantly. If only one word fits, save it.
        </P>
      </Section>

      <Section heading="The routine, in short">
        <BulletList
          items={[
            "Open with a high-frequency word suited to your mode.",
            "Few colours? Play five fresh letters. Several? Start using them.",
            "Keep greens fixed, move ambers, never reuse a gray letter.",
            "Three or more candidates left? Test their differing letters together.",
            "Stuck on the last letters? Check for a repeated letter and the common endings for your mode.",
          ]}
        />
      </Section>
    </GuideLayout>
  );
}
