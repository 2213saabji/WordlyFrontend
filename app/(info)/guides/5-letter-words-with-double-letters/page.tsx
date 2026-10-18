import { Section, BulletList } from "@/components/ContentPage";
import {
  GuideLayout,
  GuideLink,
  P,
  StatTable,
  Strong,
  Tiles,
  Walkthrough,
  WordGroups,
  guideMetadata,
} from "@/components/GuideParts";

const SLUG = "5-letter-words-with-double-letters";

export const metadata = guideMetadata(SLUG);

// From GuessWord's answer lists (backend data/words.js, October 2026). The
// word lists are the Daily and Infinite answers together (2,184 words) —
// guest play draws from a separate list that's mostly plurals. No answer has
// two different side-by-side doubles, so each word appears in one group.

const DOUBLES: [string, string][] = [
  ["OO", "afoot aloof blood bloom boost booth booty booze brood brook broom crook doozy drool droop flood floor gloom goody gooey goofy groom igloo kooky loony loopy loose moody moose noose oomph pooch proof roomy roost scoop scoot shook shoot sloop snook snoop sooty spoof spool spoon stood stool stoop swoon swoop taboo tooth troop vroom wahoo whoop wooly yahoo"],
  ["EE", "agree beech beefy breed cheek cheep cheer creek creep eerie emcee fleet freer geese green greet kneel leech leery levee melee needs needy peeve puree queen reedy reeve rupee seedy sheen sheep sheer sheet skeet sleek sleep sleet sneer speed spree steed steel steep steer sweep sweet teeny teeth three tweet unsee wheel"],
  ["LL", "allay allot allow alloy atoll bally belly bully cello chill dally drill droll dwell fella filly folly fully golly grill gully hello hilly holly jelly jolly knell knoll krill llama quell rally shall shell shill silly skill skull small smell spell spill stall still swell trill troll tulle twill villa ville"],
  ["SS", "abyss amass amiss assay asset bless bossa bossy brass chess class crass cress cross dress essay floss fussy glass gloss grass gross guess issue lasso messy mossy posse press sassy truss"],
  ["FF", "affix bluff chaff cliff fluff gaffe gruff jiffy offal offer puffy scoff skiff sniff snuff staff stiff stuff whiff"],
  ["TT", "attic batty bitty butte catty ditto ditty fatty jetty lotto matte motto nitty nutty otter petty putty ratty utter"],
  ["PP", "apple apply guppy happy hippo hippy hoppy kappa pappy peppy puppy sappy tippy upped upper"],
  ["NN", "annex annoy annul annum canna canny djinn funny henna inner manna penny runny sunny"],
  ["RR", "array arrow berry carry curry error ferry furry hurry myrrh sorry worry"],
  ["MM", "comma dummy gamma gummy hammy lemma mummy tummy yummy"],
  ["DD", "adder caddy daddy giddy kiddo muddy oddly"],
  ["GG", "baggy buggy doggy foggy leggy muggy soggy"],
  ["ZZ", "dizzy fizzy fuzzy jazzy pizza whizz"],
  ["BB", "cubby gabby hobby hubby lobby tubby"],
  ["CC", "mecca occur yucca"],
  ["VV", "savvy"],
  ["II", "radii"],
];

const DOUBLE_GROUPS = DOUBLES.map(([label, words]) => ({ label, words: words.split(" ") }));

const REPEATS_BY_MODE = [
  ["Repeats any letter", "27.6%", "34.4%", "33.2%"],
  ["Double side by side (BOOTH)", "12.4%", "15.3%", "13.0%"],
  ["Repeat apart only (EAGLE)", "15.2%", "19.1%", "20.1%"],
  ["Same letter three times", "3 words", "13 words", "21 words"],
];

const DOUBLE_POSITION = [["Answers", "3", "63", "174", "73"]];

const SPREAD_REPEATS = [
  ["E", "104", "DENSE, EAGLE, THEME, SCENE"],
  ["A", "71", "DRAMA, CANAL, SALAD, AWARE"],
  ["T", "36", "TASTE, TRUST, TITLE, START"],
  ["R", "35", "RIVER, RIDER, RURAL, ERROR"],
  ["O", "26", "PHOTO, COLOR, ROBOT, MOTOR"],
  ["C", "25", "CATCH, CYCLE, COMIC, CLOCK"],
];

const TRIPLES = "daddy eerie emcee error fluff geese levee melee mummy pappy peeve peppy puppy rarer reeve sassy".split(" ");
const PALINDROMES = "civic kayak level madam radar refer rotor tenet".split(" ");

export default function DoubleLettersPage() {
  return (
    <GuideLayout
      slug={SLUG}
      title={
        <>
          Two of the <strong className="font-bold">same letter.</strong>
        </>
      }
      intro="About one five-letter answer in three uses a letter more than once, and one in seven has the same letter twice in a row. Here is every GuessWord answer with a double letter, grouped by pair, plus the patterns that tell you when to guess one."
    >
      <Section heading="How often letters repeat">
        <StatTable
          head={["Pattern", "Daily", "Infinite", "Guest play"]}
          rows={REPEATS_BY_MODE}
          caption="Share of answers in each list. Daily 728 words, Infinite 1,456, guest play 2,844."
        />
        <P>
          Repeats are far more common than most players expect. Across the 2,184 Daily and Infinite answers,{" "}
          <Strong>32% repeat a letter</Strong> and <Strong>14% have a side-by-side double</Strong> — 313 words in
          all. A repeat with letters apart, like the two E&apos;s in EAGLE, is even more common than a double.
        </P>
      </Section>

      <Section heading="The most common double letters">
        <div className="flex flex-wrap gap-4">
          <Tiles word="booth" tones=".gg.." />
          <Tiles word="sheep" tones="..gg." />
          <Tiles word="skill" tones="...gg" />
        </div>
        <P>
          <Strong>OO, EE and LL</Strong> are in a league of their own, with 59, 53 and 51 answers each. Then comes
          SS (31), FF and TT (19 each), PP (15), NN (14) and RR (12). Every other double is rare: MM 9, DD 7, GG 7,
          ZZ 6, BB 6, CC 3, and just one answer each for VV (SAVVY) and II (RADII). There are no AA, HH, KK, UU, WW
          or YY doubles at all.
        </P>
      </Section>

      <Section heading="Where the double sits">
        <StatTable
          head={["Letters", "1st–2nd", "2nd–3rd", "3rd–4th", "4th–5th"]}
          rows={DOUBLE_POSITION}
          caption="Where the side-by-side double falls in the 313 Daily and Infinite answers that have one."
        />
        <P>
          <Strong>More than half of all doubles sit in the 3rd and 4th letters</Strong> — the __OO_ of BLOOD,
          the __EE_ of GREEN, the __LL_ of HELLO. A double at the very start is almost unheard of (only LLAMA,
          OOMPH and EERIE).
        </P>
        <P>
          At the end of the word, four doubles in five are <Strong>LL, SS or FF</Strong>: SKILL, CLASS, STAFF.
          And one double in four is followed by a final Y — FUNNY, HAPPY, BERRY, JAZZY. If you have a consonant in
          the third spot and a Y at the end, try doubling the consonant.
        </P>
      </Section>

      <Section heading="Every answer with a double letter">
        <P>All 313 Daily and Infinite answers with the same letter twice in a row, grouped by the double.</P>
        <WordGroups groups={DOUBLE_GROUPS} />
      </Section>

      <Section heading="Repeats that aren't side by side">
        <StatTable
          head={["Letter", "Answers", "Examples"]}
          rows={SPREAD_REPEATS}
          caption="Daily and Infinite answers where the letter repeats with other letters in between."
        />
        <P>
          E is by far the most common spread-out repeat, and more than half of those words end in E with another
          E earlier (THEME, SCENE, LEAVE). A comes second, often as A_A (DRAMA, SALAD). The most common positions
          for the two copies are the <Strong>first and last letter</Strong> (EAGLE, TRUST, RIVER) and the{" "}
          <Strong>second and last</Strong> (LEAVE, DENSE, START).
        </P>
      </Section>

      <Section heading="Three of the same letter">
        <WordGroups groups={[{ label: "×3", words: TRIPLES }]} />
        <P>
          Sixteen Daily and Infinite answers use one letter three times. Seven of them triple the E (EERIE, EMCEE,
          GEESE, LEVEE, MELEE, PEEVE, REEVE) and three the P (PAPPY, PEPPY, PUPPY). If you&apos;ve found two copies
          of a letter and still can&apos;t make a word, a third copy is rare but possible.
        </P>
      </Section>

      <Section heading="Palindromes">
        <WordGroups groups={[{ label: "⇄", words: PALINDROMES }]} />
        <P>
          Eight answers read the same backwards — CIVIC, KAYAK, LEVEL, MADAM, RADAR, REFER, ROTOR and TENET. Each
          repeats two letters at once, so if you have the middle letter and matching first and last letters, it
          may be one of these.
        </P>
      </Section>

      <Section heading="How a double shows up on the board">
        <P>
          Each copy of a letter is coloured separately, so a double often shows up as one green and one amber of
          the same letter. Here&apos;s a game where the answer is HAPPY:
        </P>
        <Walkthrough
          steps={[
            {
              word: "pupil",
              tones: "axgxx",
              note: (
                <>
                  A green P and an amber P in the same guess: the answer has <Strong>at least two P&apos;s</Strong>,
                  one of them in the middle.
                </>
              ),
            },
            {
              word: "apply",
              tones: "aagxg",
              note: (
                <>
                  The P in the middle stays green, the other is amber, and Y is green at the end. P_P_Y with a
                  double in the middle points straight at the answer.
                </>
              ),
            },
            { word: "happy", tones: "ggggg", note: <>Solved in three.</> },
          ]}
        />
        <P>
          For the exact colouring rules, including when an extra copy turns gray, see{" "}
          <GuideLink href="/guides/word-patterns">five-letter word patterns</GuideLink>.
        </P>
      </Section>

      <Section heading="When to guess a double">
        <BulletList
          items={[
            "You've found three or four letters and no word fits — one answer in three has a repeat.",
            "There's a gap in the 3rd–4th spot: try OO, EE or LL there first.",
            "The word ends in Y with a consonant before it: double that consonant (FUNNY, HAPPY).",
            "A consonant is stuck near the end: try LL, SS or FF.",
            "Early in the game, avoid guessing doubles — a word with five different letters tests more of the alphabet.",
          ]}
        />
        <P>
          Vowel-heavy words, including the EE and OO doubles, are listed in{" "}
          <GuideLink href="/guides/5-letter-words-with-lots-of-vowels">5-letter words with lots of vowels</GuideLink>
          . For a full method from first guess to last, read{" "}
          <GuideLink href="/guides/solving-strategy">how to solve in four guesses or fewer</GuideLink>.
        </P>
      </Section>
    </GuideLayout>
  );
}
