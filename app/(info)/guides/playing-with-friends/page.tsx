import { Section, BulletList } from "@/components/ContentPage";
import { GuideLayout, GuideLink, P, Strong, Tiles, guideMetadata } from "@/components/GuideParts";

const SLUG = "playing-with-friends";

export const metadata = guideMetadata(SLUG);

export default function PlayingWithFriendsPage() {
  return (
    <GuideLayout
      slug={SLUG}
      title={
        <>
          Same word, <strong className="font-bold">friendly rivals.</strong>
        </>
      }
      intro="A daily word game is better shared. Groups put you and your friends, family or coworkers on the same word every day, with a private leaderboard that keeps score for the day and the week."
    >
      <Section heading="How groups work">
        <P>
          A group is a private leaderboard for the <Strong>Daily word</Strong>. Everyone in it plays the same word
          as every other GuessWord player that day — groups don&apos;t get a special word — and the group&apos;s
          boards rank just its own members. You can be in several groups at once, so one for family and one for
          the office is no problem.
        </P>
        <P>
          Groups need an account, because your results have to be saved under your name. Log in, then open{" "}
          <Strong>Groups</Strong> from the menu or the home screen.
        </P>
      </Section>

      <Section heading="Create a group and invite people">
        <BulletList
          items={[
            <>
              <Strong>Create:</Strong> choose a name, and GuessWord gives the group an eight-character invite code,
              such as <code className="rounded bg-white/8 px-1.5 py-0.5 text-foreground">A1B2C3D4</code>.
            </>,
            <>
              <Strong>Invite:</Strong> send the code to the people you want in — by message, email or however your
              group talks.
            </>,
            <>
              <Strong>Join:</Strong> they open Groups, enter the code, and they&apos;re in. Codes aren&apos;t case
              sensitive.
            </>,
          ]}
        />
        <P>
          Whoever creates the group owns it and is the only one who can rename it. Any member can leave at any
          time.
        </P>
      </Section>

      <Section heading="Reading the daily board">
        <P>The daily board ranks everyone in the group who has finished today&apos;s word:</P>
        <BulletList
          items={[
            "Solvers come before anyone who ran out of guesses.",
            "Among solvers, fewer guesses ranks higher.",
            "If two players used the same number of guesses, the faster time wins.",
          ]}
        />
        <P>
          Time is measured from when you open the day&apos;s board to when you finish, so if you want a fast time,
          don&apos;t open the word until you&apos;re ready to play. After you finish, the result screen tells you
          where you placed in your group — “You&apos;re 2nd in Family today” — or, if the word beat you, how many
          of the group solved it.
        </P>
      </Section>

      <Section heading="Reading the weekly board">
        <P>
          The weekly board covers Monday to Sunday and ranks by <Strong>total wins</Strong> first, then by{" "}
          <Strong>average guesses</Strong> on the words you solved, then by average time. Only solved words count
          towards the averages, so a loss doesn&apos;t drag your average up — but it does cost you a win.
        </P>
        <P>
          That makes the weekly board a test of consistency. Someone who solves all seven words in five guesses
          beats someone who solves six in three, because seven wins beat six.
        </P>
      </Section>

      <Section heading="Sharing without spoilers">
        <P>
          When you finish the Daily word you can share your result as a grid of coloured squares, or as an image,
          without the word itself. Your friends see how your game went — not what the answer was.
        </P>
        <div className="flex flex-col gap-1.5">
          <Tiles word="     " tones="xaxxx" />
          <Tiles word="     " tones="xgaxg" />
          <Tiles word="     " tones="ggggg" />
        </div>
        <P>
          A shared link also invites friends to play the same day&apos;s word. Because the Daily word changes at
          midnight UTC, invite links are meant for the same day — send them while the word is still live.
        </P>
      </Section>

      <Section heading="Ideas for groups">
        <BulletList
          items={[
            "Agree a time: some groups all play at lunch, then compare grids.",
            "Run a weekly winner: whoever tops the weekly board on Sunday picks everyone's opening word for the next week.",
            "Try the same opener: everyone uses the same first word for a week and sees whose follow-ups are best.",
            "Add Infinite: groups only rank the Daily word, but you can compare tiers and climb together on the Infinite leaderboard.",
          ]}
        />
        <P>
          New to the game? Start with <GuideLink href="/how-to-play">how to play</GuideLink>, then pick an opener
          from the <GuideLink href="/guides/best-starting-words">best starting words guide</GuideLink>.
        </P>
      </Section>
    </GuideLayout>
  );
}
