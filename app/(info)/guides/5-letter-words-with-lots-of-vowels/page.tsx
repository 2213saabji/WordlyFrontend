import { Section, BulletList } from "@/components/ContentPage";
import {
  GuideLayout,
  GuideLink,
  P,
  StatTable,
  Strong,
  Tiles,
  WordGroups,
  byFirstLetter,
  guideMetadata,
} from "@/components/GuideParts";

const SLUG = "5-letter-words-with-lots-of-vowels";

export const metadata = guideMetadata(SLUG);

// From GuessWord's answer lists (backend data/words.js, October 2026). The
// word lists are the Daily and Infinite answers together (2,184 words) —
// guest play draws from a separate list that's mostly plurals.

const FOUR_VOWELS = ["audio", "adieu", "eerie", "queue"];

const THREE_VOWELS = `abate abide abode about above acute adage adios aegis afire afoot afoul again agape agate agave agile
agora agree ahead aisle algae alibi alien alike alive aloha alone aloof aloud amaze amigo amine amino amour amuse anima
anion anise anode aorta apnea arena argue arise aroma arose aside atone audit auger augur aural avail avian avoid await
awake aware awoke axial axiom azure bayou beaut beige biome booze cacao canoe cause cease cilia cocoa coupe cutie deuce
diode douse eager eagle easel eaten eater elite elope elude email emcee ensue equal equip erase erode etude evade evoke
exile exude fauna folio fugue gauge gauze geese genie gooey gouge guano guava guide guile guise haiku heave house ideal
idiom igloo image inane ionic irate issue juice koala lease leave levee loose louse mafia maize mania mauve media melee
moose mouse movie moxie naive niece noise noose oasis ocean odour oldie olive omega onion opera ounce outdo outer ovate
oxide ozone patio pause peace peeve piano piece pious pique pixie poise puree quail quake queen quiet quite quota quote
radii radio raise ratio reeve reuse revue rodeo rogue rouse route rupee sauce sauna segue seize sepia siege sieve suave
suede suite taboo taupe tease tiara tibia undue union unite unsee untie usage usual vague value venue video vitae vogue
voice voila wahoo waive weave yahoo`.split(/\s+/);

const NO_VOWELS = ["crypt", "flyby", "glyph", "lymph", "myrrh", "nymph", "psych", "synch", "tryst"];

const VOWEL_COUNT = [
  ["None (Y only)", "0", "9", "10"],
  ["One", "207", "456", "1,112"],
  ["Two", "454", "831", "1,584"],
  ["Three", "66", "157", "137"],
  ["Four", "1", "3", "1"],
  ["Five", "0", "0", "0"],
];

const VOWEL_SHARE = [
  ["E", "46.1%", "46.9%"],
  ["A", "40.1%", "36.5%"],
  ["O", "29.8%", "27.5%"],
  ["I", "27.6%", "25.2%"],
  ["U", "19.3%", "17.2%"],
  ["Y", "16.5%", "12.6%"],
];

const VOWEL_POSITION = [
  ["Daily + Infinite", "13.2%", "53.6%", "49.2%", "37.5%", "25.8%"],
  ["Guest play", "9.6%", "71.9%", "34.6%", "40.5%", "8.5%"],
];

const SHAPES = [
  ["C V C V C", "19.3%", "RAPID, HUMOR, SOLAR"],
  ["C C V C C", "16.2%", "BLACK, CLIFF, STAND"],
  ["C V C C C", "11.8%", "FUNNY, PUNCH, WIDTH"],
  ["C V C C V", "8.7%", "FORCE, DENSE, PIZZA"],
  ["C C V C V", "8.0%", "STONE, DRAMA, PHONE"],
  ["C C V V C", "7.8%", "STEAK, TRAIL, DREAM"],
  ["C V V C C", "7.6%", "FIELD, FAULT, TOUGH"],
  ["V C C V C", "4.2%", "OTHER, AWFUL, ACTOR"],
];

const OPENERS = [
  ["ADIEU", "1.33", "1.48", "0.32", "8.8%"],
  ["AUDIO", "1.17", "1.32", "0.28", "9.4%"],
  ["AROSE", "1.16", "1.80", "0.54", "15.5%"],
  ["IRATE", "1.14", "1.80", "0.50", "17.9%"],
  ["RAISE", "1.14", "1.78", "0.54", "17.9%"],
  ["SLATE", "0.86", "1.69", "0.62", "30.0%"],
  ["CRANE", "0.86", "1.67", "0.59", "30.0%"],
];

export default function LotsOfVowelsPage() {
  return (
    <GuideLayout
      slug={SLUG}
      title={
        <>
          Words that are <strong className="font-bold">mostly vowels.</strong>
        </>
      }
      intro="Looking for five-letter words packed with A, E, I, O and U? Here is every one GuessWord can pick as an answer — the four with four vowels, all 223 with three, and the nine with none at all — plus what the numbers say about using them as your first guess."
    >
      <Section heading="Only four answers have four vowels">
        <div className="flex flex-wrap gap-4">
          {FOUR_VOWELS.map((word) => (
            <Tiles key={word} word={word} tones="....." />
          ))}
        </div>
        <P>
          Out of 2,184 Daily and Infinite answers, just <Strong>AUDIO, ADIEU, EERIE and QUEUE</Strong> have four
          vowels. AUDIO is a Daily answer; the other three are Infinite. No five-letter answer has five vowels, and
          the only other four-vowel word the game accepts is AERIE, which can come up in guest play.
        </P>
        <P>
          Notice that EERIE and QUEUE get there by repeating a letter — they only use two different vowels. If you
          want four <em>different</em> vowels in one word, AUDIO and ADIEU are the only answers that have them.
        </P>
      </Section>

      <Section heading="How many vowels a typical answer has">
        <StatTable
          head={["Vowels (A E I O U)", "Daily", "Infinite", "Guest play"]}
          rows={VOWEL_COUNT}
          caption="Number of answers in each list. Daily 728 words, Infinite 1,456, guest play 2,844."
        />
        <P>
          Three vowels is already unusual: only about one Daily or Infinite answer in ten has them, and in guest
          play it drops to one in twenty. Most answers have two. So a word with three or more vowels is a good
          guess to <em>find</em> vowels, but rarely the answer itself.
        </P>
      </Section>

      <Section heading="Every answer with three vowels">
        <P>
          All 223 Daily and Infinite answers with exactly three vowels (A, E, I, O, U — Y not counted). Words like
          GEESE and QUEEN count the repeated E twice.
        </P>
        <WordGroups groups={byFirstLetter(THREE_VOWELS)} />
        <P>
          Three in five of them end in E, and half start with a vowel — more than a quarter with A alone. The two
          most common shapes are consonant–vowel–vowel–consonant–vowel, like HOUSE, VOICE and PAUSE, and
          vowel–consonant–vowel–consonant–vowel, like ABOVE, ALONE and AWARE.
        </P>
      </Section>

      <Section heading="Which vowels show up most">
        <StatTable
          head={["Letter", "Daily + Infinite", "Guest play"]}
          rows={VOWEL_SHARE}
          caption="Share of answers that contain the letter at least once."
        />
        <P>
          <Strong>E is in nearly half of all answers</Strong>, and A in about two in five. U is the rarest true
          vowel — in fewer than one answer in five — which is one reason U-heavy openers like AUDIO underperform.
          Y appears in about one answer in six, usually at the end (FUNNY, HAPPY, STORY).
        </P>
      </Section>

      <Section heading="Where vowels sit in the word">
        <StatTable
          head={["List", "1st", "2nd", "3rd", "4th", "5th"]}
          rows={VOWEL_POSITION}
          caption="Share of answers with a vowel in each position."
        />
        <P>
          The <Strong>second letter is a vowel in more than half</Strong> of all answers, and the third in about
          half. The first letter is a vowel only about one time in eight. In guest play the pattern is even
          sharper: seven answers in ten have a vowel second, and fewer than one in ten ends in one — because more
          than half of guest answers are plurals ending in S.
        </P>
        <P>
          So when you know a vowel is in the word but not where, try it second or third before anywhere else.
        </P>
      </Section>

      <Section heading="The common shapes of a word">
        <StatTable
          head={["Shape (C consonant, V vowel)", "Share", "Examples"]}
          rows={SHAPES}
          caption="Most common consonant–vowel patterns in Daily and Infinite answers."
        />
        <P>
          The single most common shape is <Strong>consonant–vowel–consonant–vowel–consonant</Strong>, like RAPID
          or SOLAR — about one answer in five. Close behind are words with one vowel boxed in by consonant pairs,
          like BLACK and STAND. Knowing these shapes helps when you have the vowels and need to place the rest.
        </P>
      </Section>

      <Section heading="Are vowel-heavy first guesses worth it?">
        <StatTable
          head={["Opener", "Vowels found", "Letters found", "Greens", "No vowel found"]}
          rows={OPENERS}
          caption="Average result of each first guess across all 2,184 Daily and Infinite answers. Letters found = green or amber."
        />
        <P>
          ADIEU does what it promises: it finds the most vowels (1.33 per game) and leaves you with no vowel at all
          only 8.8% of the time. But it finds <Strong>fewer letters overall</Strong> than AROSE, IRATE or RAISE,
          and noticeably fewer green tiles (0.32 a game against 0.54). Those openers still find more than one vowel
          on average, and their consonants — R, S and T — are common in answers.
        </P>
        <P>
          In short, vowels are easy to find later — almost every answer has one or two — while greens and common
          consonants are what narrow the board fastest. The full comparison is in{" "}
          <GuideLink href="/guides/best-starting-words">the best starting words</GuideLink>.
        </P>
      </Section>

      <Section heading="Answers with no vowels at all">
        <div className="flex flex-wrap gap-4">
          {NO_VOWELS.map((word) => (
            <Tiles key={word} word={word} tones="....." />
          ))}
        </div>
        <P>
          Nine Infinite answers have no A, E, I, O or U and use Y instead: CRYPT, FLYBY, GLYPH, LYMPH, MYRRH, NYMPH,
          PSYCH, SYNCH and TRYST. None of them is a Daily answer. Guest play has ten more, such as GYPSY, MYTHS
          and SYNTH. If you&apos;ve ruled out every vowel and the board still won&apos;t budge, try a Y in the
          second or third spot.
        </P>
      </Section>

      <Section heading="Tips for using vowels well">
        <BulletList
          items={[
            "Expect two vowels. Once you've found two, spend your next guess on consonants.",
            "Try a known vowel in the second or third spot first — that's where most vowels sit.",
            "E and A are the vowels most worth testing early; U is the least.",
            "No vowels found after two guesses? Look for Y, or a repeated vowel such as EE or OO.",
            "Save the three-vowel words for when you need to place vowels, not as an opener.",
          ]}
        />
        <P>
          Repeated vowels are covered in{" "}
          <GuideLink href="/guides/5-letter-words-with-double-letters">5-letter words with double letters</GuideLink>
          , and endings and other shapes in{" "}
          <GuideLink href="/guides/word-patterns">five-letter word patterns</GuideLink>.
        </P>
      </Section>
    </GuideLayout>
  );
}
