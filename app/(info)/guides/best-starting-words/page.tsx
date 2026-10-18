import { Section, BulletList } from "@/components/ContentPage";
import { GuideLayout, GuideLink, P, StatTable, Strong, Tiles, guideMetadata } from "@/components/GuideParts";

const SLUG = "best-starting-words";

export const metadata = guideMetadata(SLUG);

// Expected answers left after the opener, from scoring every distinct-letter
// guess against each answer list (backend data/words.js, October 2026).
const BY_MODE = [
  ["Daily (728 words)", "IRATE 15.7", "ORATE 15.8", "ARISE 16.1", "CRANE 20.0", "ADIEU 39.3"],
  ["Infinite (1,456 words)", "RAISE 41.8", "AROSE 43.6", "ARISE 45.1", "CRANE 53.1", "ADIEU 79.7"],
  ["Guest play (2,844 words)", "TALES 85.2", "ALOES 87.5", "REALS 87.7", "CRANE 180.5", "ADIEU 159.8"],
];

const POPULAR = [
  ["RAISE", "16.9", "41.8", "112.4"],
  ["STARE", "17.5", "50.5", "105.7"],
  ["SLATE", "18.7", "51.1", "103.0"],
  ["TARES", "18.4", "50.1", "88.5"],
  ["CRANE", "20.0", "53.1", "180.5"],
  ["TRACE", "17.5", "53.3", "173.7"],
  ["ADIEU", "39.3", "79.7", "159.8"],
  ["AUDIO", "61.3", "114.0", "244.7"],
];

export default function BestStartingWordsPage() {
  return (
    <GuideLayout
      slug={SLUG}
      title={
        <>
          The best first guess, <strong className="font-bold">measured.</strong>
        </>
      }
      intro="Most “best starting word” lists are built on the whole English dictionary. GuessWord picks its answers from fixed lists, so we tested every opening word against those lists instead. The winner depends on which mode you're playing."
    >
      <Section heading="How we scored them">
        <P>
          A good opener is one that leaves you with the fewest possible answers. For every five-letter word with no
          repeated letters, we played it against every answer in a list and grouped the answers by the colour
          pattern they would show. The <Strong>expected answers left</Strong> is the average size of the group
          you&apos;d land in. Lower is better: an opener with 16 expected answers left gives you a far easier second
          guess than one with 40.
        </P>
        <P>
          This is a stricter test than counting how many green or amber tiles a word usually earns. A word can light
          up plenty of amber tiles and still leave you guessing, if those tiles show up for the same big group of
          words every time. What matters is how well a guess <em>splits</em> the list.
        </P>
      </Section>

      <Section heading="The best openers for each mode">
        <StatTable
          head={["Mode", "Best", "2nd", "3rd", "CRANE", "ADIEU"]}
          rows={BY_MODE}
          caption="Expected answers left after the first guess. Lower is better."
        />
        <P>
          For the <Strong>Daily word</Strong>, IRATE, ORATE and ARISE come out on top. The Daily list leans on
          common, everyday words: E appears in more than half of them, R in 41%, and very few are plurals, so words
          that test E, A, R and T without wasting a slot on S do best.
        </P>
        <P>
          In <Strong>Infinite</Strong> the list is twice as large and more varied, and RAISE edges ahead. The
          leading words are close together — anything from the top ten will serve you well.
        </P>
        <P>
          <Strong>Guest play</Strong> (the rounds you play on the home page without logging in) is a different
          game. More than half of its answers end in S — plurals such as “tales” and verb forms such as “rates” —
          so openers that put S in the last slot, like TALES and REALS, leave about half as many answers as CRANE.
        </P>
      </Section>

      <Section heading="How popular openers compare">
        <StatTable
          head={["Opener", "Daily", "Infinite", "Guest play"]}
          rows={POPULAR}
          caption="Expected answers left after the first guess, per answer list."
        />
        <P>
          CRANE, the opener many players swear by, is solid for the Daily word but falls behind in guest play,
          because it can&apos;t test the final S. SLATE and STARE are the safest all-rounders: never the best in a
          mode, but never far off.
        </P>
      </Section>

      <Section heading="Why ADIEU and AUDIO disappoint">
        <P>
          Vowel-heavy openers feel clever — four vowels in one guess! — but the numbers say otherwise. ADIEU leaves
          roughly twice as many answers as the best opener in every mode, and AUDIO about three times as many.
        </P>
        <BulletList
          items={[
            "Almost every answer has a vowel, and most have exactly two (57% across our lists), so learning which vowels are present tells you less than you'd think.",
            "Consonants such as R, T, S, L and N divide the list much more sharply. Knowing whether there's an R narrows things far more than knowing whether there's a U.",
            "ADIEU and AUDIO rarely earn green tiles, because their vowels sit in unusual positions. Greens are the most valuable feedback in the game.",
          ]}
        />
        <P>
          In a full simulation, a player who opened with ADIEU and then always chose the most informative remaining
          word needed 4.28 guesses on average and failed 6.3% of games. The same player opening with TARES or
          CRANE averaged 4.06 guesses and failed about 4%.
        </P>
      </Section>

      <Section heading="A good second word">
        <P>
          If your opener comes back mostly gray, a second word with five fresh letters is usually the best move.
          Paired with TARES, these second words make the strongest two-guess start across all our lists — about 10
          answers left on average after both:
        </P>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Tiles word="blond" tones="....." />
          <Tiles word="could" tones="....." />
          <Tiles word="login" tones="....." />
        </div>
        <P>
          Each brings in L, O and D or N — common letters TARES doesn&apos;t test. Once you have two or three
          coloured tiles, though, stop exploring and start using them; the{" "}
          <GuideLink href="/guides/solving-strategy">solving strategy guide</GuideLink> explains when to switch.
        </P>
      </Section>

      <Section heading="The short version">
        <BulletList
          items={[
            <>
              Daily word: open with <Strong>IRATE</Strong>, <Strong>ARISE</Strong> or <Strong>RAISE</Strong>.
            </>,
            <>
              Infinite: <Strong>RAISE</Strong> or <Strong>AROSE</Strong>.
            </>,
            <>
              Guest play: <Strong>TALES</Strong> or <Strong>TARES</Strong> — test that final S.
            </>,
            <>
              One word for everything: <Strong>SLATE</Strong> or <Strong>STARE</Strong>.
            </>,
            "Skip ADIEU and AUDIO — vowels tell you less than consonants.",
          ]}
        />
        <P>
          Want to know why these letters work? The{" "}
          <GuideLink href="/guides/letter-frequency">letter frequency guide</GuideLink> breaks down every letter and
          position.
        </P>
      </Section>
    </GuideLayout>
  );
}
