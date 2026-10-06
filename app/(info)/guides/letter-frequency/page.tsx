import { Section, BulletList } from "@/components/ContentPage";
import { GuideLayout, GuideLink, P, StatTable, Strong, guideMetadata } from "@/components/GuideParts";

const SLUG = "letter-frequency";

export const metadata = guideMetadata(SLUG);

// Share of answers containing each letter at least once, across all three
// answer lists (5,028 words; backend data/words.js, October 2026).
const ALL_LETTERS: [string, string][] = [
  ["S", "47.7%"], ["E", "46.6%"], ["A", "38.0%"], ["R", "31.5%"], ["O", "28.5%"], ["I", "26.3%"],
  ["T", "25.6%"], ["L", "25.4%"], ["N", "21.2%"], ["D", "19.7%"], ["U", "18.1%"], ["C", "16.3%"],
  ["P", "15.3%"], ["Y", "14.3%"], ["H", "13.6%"], ["M", "13.5%"], ["B", "11.7%"], ["G", "11.7%"],
  ["K", "9.9%"], ["W", "8.9%"], ["F", "8.8%"], ["V", "5.6%"], ["X", "2.1%"], ["Z", "2.0%"],
  ["J", "1.6%"], ["Q", "1.0%"],
];

const TOP_BY_MODE = [
  ["Daily", "E 51.8%", "A 42.4%", "R 41.1%", "T 33.8%", "S 28.7%"],
  ["Infinite", "E 43.3%", "A 38.9%", "R 35.0%", "O 30.8%", "I 27.5%"],
  ["Guest play", "S 63.4%", "E 46.9%", "A 36.5%", "O 27.5%", "R 27.3%"],
];

const POSITIONS_DAILY = [
  ["1st", "S 16.8%", "C 9.2%", "B 7.4%", "T 7.4%"],
  ["2nd", "R 14.6%", "O 12.4%", "A 11.3%", "E 10.4%"],
  ["3rd", "A 16.6%", "I 12.4%", "E 10.7%", "O 9.8%"],
  ["4th", "E 13.7%", "S 8.7%", "A 8.5%", "N 8.1%"],
  ["5th", "E 21.7%", "T 13.3%", "R 9.6%", "Y 8.1%"],
];

const POSITIONS_INFINITE = [
  ["1st", "S 15.6%", "C 8.7%", "B 7.2%", "A 6.5%"],
  ["2nd", "A 14.1%", "O 12.8%", "E 10.5%", "I 9.9%"],
  ["3rd", "A 12.0%", "O 11.0%", "I 9.9%", "R 6.9%"],
  ["4th", "E 13.9%", "I 6.9%", "N 6.8%", "O 6.6%"],
  ["5th", "E 17.2%", "Y 17.1%", "R 10.0%", "T 9.2%"],
];

const POSITIONS_GUEST = [
  ["1st", "S 10.9%", "B 7.7%", "C 7.5%", "P 7.1%"],
  ["2nd", "A 19.8%", "O 17.0%", "I 12.9%", "E 12.2%"],
  ["3rd", "R 9.3%", "A 8.8%", "L 8.4%", "I 8.3%"],
  ["4th", "E 27.8%", "T 9.3%", "L 6.3%", "N 6.1%"],
  ["5th", "S 54.8%", "D 10.8%", "Y 8.5%", "E 4.4%"],
];

const POSITION_HEAD = ["Position", "Most common", "2nd", "3rd", "4th"];

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));
}

export default function LetterFrequencyPage() {
  return (
    <GuideLayout
      slug={SLUG}
      title={
        <>
          Which letters <strong className="font-bold">really matter.</strong>
        </>
      }
      intro="Knowing which letters turn up most — and where in the word they sit — is the quickest way to pick better guesses. These figures come straight from GuessWord's answer lists, so they describe the words you'll actually meet."
    >
      <Section heading="What the numbers mean">
        <P>
          Each percentage is the share of answers that contain the letter <Strong>at least once</Strong>. “S
          47.7%” means almost half of all possible answers have an S somewhere in them. We count a letter once per
          word, so “geese” adds one to E, not three — that&apos;s what matters when you decide whether a letter is
          worth testing.
        </P>
        <P>
          GuessWord has three answer lists: 728 Daily words, 1,456 Infinite words and 2,844 words for rounds
          played without an account. The overall table combines all 5,028; the tables after it split them up,
          because the lists behave quite differently.
        </P>
      </Section>

      <Section heading="Every letter, most to least common">
        <StatTable
          head={["Letter", "In answers", "Letter", "In answers"]}
          rows={chunk(ALL_LETTERS, 2).map((pair) => pair.flat())}
          caption="All three answer lists combined (5,028 words)."
        />
        <P>
          Two letters stand apart: S and E each appear in nearly half of all answers. After them come A, R and O,
          then a close pack of I, T and L around a quarter each. At the other end, V, X, Z, J and Q together appear
          in fewer than one answer in eight — testing them early almost always wastes a slot.
        </P>
      </Section>

      <Section heading="The top five letters in each mode">
        <StatTable head={["Mode", "1st", "2nd", "3rd", "4th", "5th"]} rows={TOP_BY_MODE} />
        <BulletList
          items={[
            <>
              <Strong>Daily:</Strong> E leads (more than half of all Daily words), and R is unusually strong at 41%.
              S drops to fifth because Daily answers are rarely plurals.
            </>,
            <>
              <Strong>Infinite:</Strong> similar to Daily but with more O, U and Y — about twice as many Infinite
              answers end in Y.
            </>,
            <>
              <Strong>Guest play:</Strong> S jumps to the top at 63%, because more than half of these answers end
              in S. D rises too, thanks to past tenses ending in -ED.
            </>,
          ]}
        />
      </Section>

      <Section heading="Where letters sit: Daily">
        <StatTable head={POSITION_HEAD} rows={POSITIONS_DAILY} caption="Share of Daily answers with that letter in that position." />
        <P>
          Daily words most often start with S, C, B or T and end in E (more than one in five), T, R or Y. R is the
          most common second letter — think of words that open with a consonant pair like “br”, “cr” or “tr”.
        </P>
      </Section>

      <Section heading="Where letters sit: Infinite">
        <StatTable head={POSITION_HEAD} rows={POSITIONS_INFINITE} caption="Share of Infinite answers with that letter in that position." />
        <P>
          The big difference is the last letter: Y ends 17% of Infinite answers, almost as often as E. If an
          Infinite board shows a vowel pattern but no ending yet, Y in the last slot is a strong candidate.
        </P>
      </Section>

      <Section heading="Where letters sit: guest play">
        <StatTable head={POSITION_HEAD} rows={POSITIONS_GUEST} caption="Share of guest-play answers with that letter in that position." />
        <P>
          More than half of guest-play answers end in S, and the fourth letter is E in more than a quarter of them
          — the “-es” and “-ed” endings at work. A guess that puts E fourth and S fifth can score two greens straight
          away.
        </P>
      </Section>

      <Section heading="Putting it to use">
        <BulletList
          items={[
            "Spend your first two guesses on the high-frequency letters: E, A, R, S, O, I, T, L and N cover most answers.",
            "Use position, not just presence. An amber S is far more likely to belong in the first or last slot than in the middle.",
            "Every answer in our lists that contains Q also contains U, so if you've found a Q, test U next.",
            "Leave V, X, Z, J and Q until the board points to them — between them they appear in very few answers.",
          ]}
        />
        <P>
          The <GuideLink href="/guides/best-starting-words">best starting words guide</GuideLink> turns these
          letters into specific openers, and the{" "}
          <GuideLink href="/guides/word-patterns">word patterns guide</GuideLink> covers endings, double letters and
          vowels.
        </P>
      </Section>
    </GuideLayout>
  );
}
