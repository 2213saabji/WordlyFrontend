import { Section, BulletList } from "@/components/ContentPage";
import { GuideLayout, GuideLink, P, Strong, guideMetadata } from "@/components/GuideParts";

const SLUG = "guess-word-games";

export const metadata = guideMetadata(SLUG);

// Other games are named in the body only — never in titles, headings or the
// URL (Wordle is a New York Times trademark).
const OTHER_GAMES = [
  {
    name: "Wordle",
    body: "The daily game that made the format famous, now published by The New York Times. One five-letter word a day, six guesses, and a grid of coloured squares to share. Its strength is the ritual: everyone you know is solving the same word.",
  },
  {
    name: "Dordle",
    body: "Two boards at once, with seven guesses to solve both. Every word you type goes on both boards, so a guess that helps one can waste a turn on the other. A good next step if a single board starts to feel easy.",
  },
  {
    name: "Quordle",
    body: "Four words at once in nine guesses. It rewards planning: an early guess that tests common letters pays off on four boards instead of one. There's a daily puzzle and a practice mode for unlimited games.",
  },
  {
    name: "Octordle",
    body: "Eight words in thirteen guesses. It's the longest of the multi-board games, and it's more about careful bookkeeping — tracking which letters each board still needs — than any single clever guess.",
  },
  {
    name: "Absurdle",
    body: "A deliberately unfair twist: there is no fixed answer. After each guess, the game picks the reply that keeps as many words in play as possible, so you're playing against it. Guesses are unlimited; the challenge is cornering it in as few as you can.",
  },
  {
    name: "Contexto",
    body: "You guess by meaning, not by letters. Each guess gets a rank showing how close it is to the secret word, with the answer at number one. Guesses are unlimited and words can be any length, which makes it a relaxed change of pace.",
  },
  {
    name: "Semantle",
    body: "Also meaning-based, but harder. Each guess gets a similarity score instead of a simple rank, and the scores can feel odd until you get used to them. Very satisfying to crack, but expect a slow start.",
  },
];

export default function GuessWordGamesPage() {
  return (
    <GuideLayout
      slug={SLUG}
      title={
        <>
          Guess word games, <strong className="font-bold">side by side.</strong>
        </>
      }
      intro="A guess word game hides a word and gives you a limited number of tries to find it, with a clue after every guess. The idea is simple, but the games built on it play very differently. Here's what each one is like, starting with ours."
    >
      <Section heading="What they have in common">
        <P>
          Most guess word games use the same loop: you type a word, the game tells you how close you are, and you
          use that feedback to narrow down the answer. The differences are in the feedback and the stakes. Letter
          games colour each tile to show whether a letter is in the word and in the right place. Meaning games
          ignore spelling and tell you how close your word is in meaning. Some give you one puzzle a day; others
          let you play for as long as you like.
        </P>
        <P>
          None of these is the &ldquo;right&rdquo; one. They suit different moods: a two-minute daily habit, a long
          session on the sofa, or a contest with friends.
        </P>
      </Section>

      <Section heading="GuessWord: Daily, Infinite tiers and groups">
        <P>
          GuessWord is a free guess word game you play in the browser, with nothing to install. You get six tries
          to find a five-letter word: green tiles mark letters in the right spot, amber tiles mark letters in the
          word but in the wrong spot, and gray tiles mark letters that aren&apos;t in it. There are three ways to
          play.
        </P>
        <BulletList
          items={[
            <>
              <Strong>Daily word.</Strong> One word for everyone, new at midnight UTC. Solving it keeps your streak
              going. The answers come from a list of 728 everyday words, so you won&apos;t lose to an obscure one.
            </>,
            <>
              <Strong>Infinite tiers.</Strong> A new word as soon as you finish the last one. When you&apos;re signed
              in, every solved word earns points on your tier&apos;s leaderboard. Meet your daily targets on enough
              days in a row and you climb, through eight tiers from Stone to Diamond; miss too many and you drop
              back.
            </>,
            <>
              <Strong>Groups.</Strong> Create a group and share its eight-character invite code. Everyone plays the
              same Daily word and ranks on the group&apos;s daily and weekly boards.
            </>,
          ]}
        />
        <P>
          You can play Infinite on the home page without an account, and log in when you want the Daily word,
          streaks, tiers and groups. New to the format? Start with{" "}
          <GuideLink href="/how-to-play">how to play</GuideLink>, then pick an opener from our{" "}
          <GuideLink href="/guides/best-starting-words">best starting words guide</GuideLink>.
        </P>
      </Section>

      <Section heading="Other guess word games worth playing">
        <P>
          These are the games players mention most often alongside ours. All of them are free to play in a
          browser.
        </P>
        {OTHER_GAMES.map((game) => (
          <P key={game.name}>
            <Strong>{game.name}.</Strong> {game.body}
          </P>
        ))}
      </Section>

      <Section heading="How to choose">
        <BulletList
          items={[
            "For a quick daily habit, pick one puzzle a day: GuessWord's Daily word or Wordle. A few minutes, then you're done until tomorrow.",
            "If you want to keep playing, GuessWord Infinite gives you endless words and a tier to climb, so there's a reason to come back. Dordle and Quordle practice modes are also unlimited.",
            "For a harder challenge, Octordle tests how many words you can juggle, and Absurdle puts a stubborn opponent on the other side.",
            "If you care more about meaning than spelling, start with Contexto, and move to Semantle when you want something tougher.",
            "To play with friends, GuessWord groups give your circle its own leaderboard. With most other games, you share result grids in a chat instead.",
          ]}
        />
        <P>
          The letter games share most of their skills, so practice in one carries over to the rest: a strong first
          word, reading the tiles carefully, and knowing when to stop exploring and start solving. If you want to
          start right now, our <GuideLink href="/">guess word game</GuideLink> is one click away, with no sign-up
          needed.
        </P>
      </Section>
    </GuideLayout>
  );
}
