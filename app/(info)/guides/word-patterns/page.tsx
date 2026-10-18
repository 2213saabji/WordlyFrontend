import { Section, BulletList } from "@/components/ContentPage";
import { GuideLayout, GuideLink, P, StatTable, Strong, Walkthrough, guideMetadata } from "@/components/GuideParts";

const SLUG = "word-patterns";

export const metadata = guideMetadata(SLUG);

// From GuessWord's answer lists (backend data/words.js, October 2026).
const SHAPE_BY_MODE = [
  ["Repeats a letter", "27.6%", "34.4%", "33.2%"],
  ["Double letter side by side", "12.4%", "15.3%", "13.0%"],
  ["Ends in S", "2.7%", "1.6%", "54.8%"],
  ["Ends in E", "21.7%", "17.2%", "4.4%"],
  ["Ends in Y", "8.1%", "17.1%", "8.5%"],
];

const VOWELS_BY_MODE = [
  ["One vowel", "28.4%", "31.3%", "39.1%"],
  ["Two vowels", "62.4%", "57.1%", "55.7%"],
  ["Three vowels", "9.1%", "10.8%", "4.8%"],
];

const ENDINGS = [
  ["Daily", "-ER 6.7%", "-SE 3.6%", "-AL 3.0%", "-TH 3.0%", "-CH 2.6%"],
  ["Infinite", "-ER 6.8%", "-CH 2.5%", "-KY 2.0%", "-LY 1.9%", "-TY 1.8%"],
  ["Guest play", "-ES 12.1%", "-ED 10.0%", "-TS 7.0%", "-KS 4.4%", "-LS 4.1%"],
];

export default function WordPatternsPage() {
  return (
    <GuideLayout
      slug={SLUG}
      title={
        <>
          Spot the shape <strong className="font-bold">of the word.</strong>
        </>
      }
      intro="Letters are only half the story. Five-letter words fall into a handful of shapes — common endings, repeated letters, a predictable number of vowels — and recognising them is often what turns guess five into a solve."
    >
      <Section heading="The shape of an answer, by mode">
        <StatTable
          head={["Pattern", "Daily", "Infinite", "Guest play"]}
          rows={SHAPE_BY_MODE}
          caption="Share of answers in each list. Daily 728 words, Infinite 1,456, guest play 2,844."
        />
        <P>
          The single most useful fact here: <Strong>about one answer in three repeats a letter</Strong>. Players
          tend to avoid guessing words with repeats, which is sensible early on — but when you&apos;re down to a few
          candidates and none of them fit, a repeated letter is the most likely thing you&apos;ve missed.
        </P>
        <P>
          The other big difference is the ending. Daily and Infinite answers almost never end in S, while more than
          half of guest-play answers do. If you&apos;re playing on the home page without an account, put S last
          until the board tells you otherwise; in the Daily game, don&apos;t.
        </P>
      </Section>

      <Section heading="How repeated letters are coloured">
        <P>
          GuessWord colours tiles in two passes. First, every letter in exactly the right spot turns green. Then,
          from left to right, letters that are in the word but in the wrong spot turn amber —{" "}
          <Strong>but only as many times as the letter actually appears</Strong>. Any extra copies turn gray.
        </P>
        <Walkthrough
          steps={[
            {
              word: "geese",
              tones: "xxggx",
              note: (
                <>
                  If the answer has one E, only one of your three E&apos;s gets colour. Here the middle E is green
                  and the other two are gray — which tells you the answer has <Strong>exactly one E</Strong>.
                </>
              ),
            },
            {
              word: "eager",
              tones: "axxax",
              note: (
                <>
                  Two amber E&apos;s means the answer has <Strong>at least two E&apos;s</Strong>, and neither is in
                  the first or fourth spot.
                </>
              ),
            },
          ]}
        />
        <P>
          So a gray tile on a repeated letter doesn&apos;t mean the letter is absent — check whether another copy
          of it is coloured. This catches out a lot of players.
        </P>
      </Section>

      <Section heading="Which letters repeat">
        <P>
          Across all our answers, the letters most likely to appear twice are E, S, O, L, A and T, in that order.
          When they sit side by side, the most common pairs are <Strong>EE</Strong>, <Strong>OO</Strong> and{" "}
          <Strong>LL</Strong> — each in well over a hundred answers — followed at a distance by FF, SS, TT, NN and
          RR.
        </P>
        <BulletList
          items={[
            "Stuck with E in place and a gap beside it? Try EE.",
            "An O with no other vowel showing is a good moment to try OO.",
            "Found an L near the end? LL is one of the three most common doubles, so try it before moving on.",
          ]}
        />
        <P>
          Every answer with a double, grouped by pair, is in{" "}
          <GuideLink href="/guides/5-letter-words-with-double-letters">5-letter words with double letters</GuideLink>
          .
        </P>
      </Section>

      <Section heading="How many vowels to expect">
        <StatTable head={["Vowels (A E I O U)", "Daily", "Infinite", "Guest play"]} rows={VOWELS_BY_MODE} />
        <P>
          Most answers have <Strong>exactly two vowels</Strong>, and almost all the rest have one. Only 19 words
          in all our lists have no A, E, I, O or U — they lean on Y instead. That gives you a useful check: once
          you&apos;ve found two vowels, stop hunting for more and spend your next guess on consonants.
        </P>
        <P>
          For the full list of answers with three or four vowels, see{" "}
          <GuideLink href="/guides/5-letter-words-with-lots-of-vowels">5-letter words with lots of vowels</GuideLink>
          .
        </P>
      </Section>

      <Section heading="Common endings">
        <StatTable head={["Mode", "1st", "2nd", "3rd", "4th", "5th"]} rows={ENDINGS} caption="Most common last two letters." />
        <P>
          <Strong>-ER</Strong> is the most common ending in both the Daily and Infinite lists. Daily words also
          often end in -SE, -AL, -TH, -CH and -CK, while Infinite has many words ending in Y (-KY, -LY, -TY). In
          guest play, plurals and past tenses dominate: -ES, -ED, -TS, -KS and -LS.
        </P>
        <P>
          When you have the first three letters but the end won&apos;t come, run through the endings for your
          mode before trying anything exotic.
        </P>
      </Section>

      <Section heading="A quick checklist when you're stuck">
        <BulletList
          items={[
            "Is a letter repeated? One answer in three has a repeat.",
            "Have you tried the common ending for this mode — -ER, -E or -Y in Daily and Infinite, -S or -ED in guest play?",
            "Two vowels found? Then the rest are probably consonants.",
            "Is a gray tile actually a spare copy of a letter that's coloured elsewhere?",
          ]}
        />
        <P>
          For a full method from first guess to last, read{" "}
          <GuideLink href="/guides/solving-strategy">how to solve in four guesses or fewer</GuideLink>.
        </P>
      </Section>
    </GuideLayout>
  );
}
