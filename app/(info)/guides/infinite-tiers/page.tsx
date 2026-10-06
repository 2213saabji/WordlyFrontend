import { Section, BulletList } from "@/components/ContentPage";
import { GuideLayout, GuideLink, P, StatTable, Strong, guideMetadata } from "@/components/GuideParts";

const SLUG = "infinite-tiers";

export const metadata = guideMetadata(SLUG);

// The tier ladder as configured in October 2026 (backend TierConfig
// defaults). The server can change these without a release — the game
// always shows a player's live targets — so keep the "at the time of
// writing" wording, and update the table if the config changes.
const LADDER = [
  ["Stone", "—", "—", "3", "Free"],
  ["Iron", "10 min", "3", "5", "Free"],
  ["Copper", "15 min", "5", "7", "1,000 coins"],
  ["Bronze", "20 min", "7", "10", "1,000 coins"],
  ["Silver", "25 min", "9", "14", "1,000 coins"],
  ["Gold", "35 min", "12", "21", "1,000 coins"],
  ["Platinum", "45 min", "15", "30", "1,000 coins"],
  ["Diamond", "60 min", "20", "30", "1,000 coins"],
];

const SCORING = [
  ["Solved in 2", "18"],
  ["Solved in 3", "16"],
  ["Solved in 4", "14"],
  ["Solved in 5", "12"],
  ["Solved in 6", "10"],
  ["Not solved (or abandoned after a guess)", "0"],
  ["Daily targets met", "+20 bonus"],
];

export default function InfiniteTiersPage() {
  return (
    <GuideLayout
      slug={SLUG}
      title={
        <>
          From Stone <strong className="font-bold">to Diamond.</strong>
        </>
      }
      intro="Infinite mode gives you unlimited words and a ladder of eight tiers to climb. The rules are simple once you see how points, daily targets and day counts fit together — this guide explains each piece and walks through a real climb."
    >
      <Section heading="The two things you track">
        <P>Your progress in Infinite has two separate parts, and it helps to keep them apart in your head:</P>
        <BulletList
          items={[
            <>
              <Strong>Points</Strong> rank you on your tier&apos;s leaderboard. You earn them by solving words.
            </>,
            <>
              <Strong>Your day count</Strong> decides when you move up. A day counts when you meet your tier&apos;s
              daily targets: a number of minutes played and a number of rounds completed.
            </>,
          ]}
        />
        <P>
          Points never promote you on their own, and a high day count doesn&apos;t move you up the leaderboard. You
          need both: the day count to climb, the points to place well in each tier along the way.
        </P>
      </Section>

      <Section heading="How points are scored">
        <StatTable head={["Result", "Points"]} rows={SCORING} />
        <P>
          A solved word earns 10 points plus 2 for every guess you didn&apos;t need, so speed is rewarded but any
          solve is worth something. Unsolved rounds earn nothing, and so does skipping a word after you&apos;ve
          started guessing — so think twice before abandoning a hard board. Each day you meet your targets adds a
          20-point bonus. Tier leaderboards rank by points, then by days counted in the tier.
        </P>
        <P>Every word you solve while logged in, Daily or Infinite, also earns you 10 coins.</P>
      </Section>

      <Section heading="The ladder">
        <StatTable
          head={["Tier", "Minutes a day", "Rounds a day", "Days in a row to move up", "Hints"]}
          rows={LADDER}
          caption="Targets at the time of writing. The game always shows your current tier's live targets."
        />
        <P>
          Everyone starts in Stone after their first completed Infinite round. Each tier has its own leaderboard,
          and the targets grow as you climb — Diamond asks for an hour and 20 rounds a day, sustained for 30 days.
          New tiers are reached at the daily reset, <Strong>midnight IST</Strong>.
        </P>
      </Section>

      <Section heading="Moving up — and what happens to your points">
        <P>
          Meet your targets on enough days in a row and you move up at the next midnight IST. You start the new tier
          with <Strong>20% of your points</Strong>, so everyone in a tier begins on a fairly even footing and the
          leaderboard reflects how you play there, not how long you spent below.
        </P>
        <P>
          A missed day — one where you played but fell short of a target — resets your day count to zero. It
          doesn&apos;t cost points.
        </P>
      </Section>

      <Section heading="Dropping down">
        <P>
          Each tier lets you miss up to two days within a rolling window: 7 days in Iron, Copper and Bronze; 14 in
          Silver; 21 in Gold; and 30 in Platinum and Diamond. A <Strong>third miss</Strong> inside that window drops
          you one tier. You keep 20% of your points minus a 50-point penalty, never below zero — 900 points in Gold
          becomes 130 in Silver. Stone is the bottom tier, so you can&apos;t drop below it.
        </P>
        <P>
          Separately, a day with <Strong>no completed rounds at all</Strong> costs 5% of your points (at least 10).
          Playing even one round avoids that, though it won&apos;t meet higher tiers&apos; targets on its own.
        </P>
      </Section>

      <Section heading="A worked example">
        <P>Here&apos;s how a typical first week might go for a new player.</P>
        <BulletList
          items={[
            <>
              <Strong>Day 1, Stone.</Strong> They play five rounds: four solved, in 4, 3, 5 and 4 guesses (14 + 16 +
              12 + 14 = 56 points), and one missed (0). Stone has no minimum targets, so the day counts: +20 bonus,
              76 points, day count 1 of 3.
            </>,
            <>
              <Strong>Days 2–3.</Strong> Two more days like it bring them to about 230 points and a day count of 3 of
              3. At midnight IST they move up to Iron, carrying 20%: about 45 points.
            </>,
            <>
              <Strong>Days 4–8, Iron.</Strong> Iron asks for 10 minutes and 3 rounds a day. They hit it on days 4, 5
              and 6, but on day 7 they only manage two rounds — a missed day. Their day count resets to zero, but they
              keep their points.
            </>,
            <>
              <Strong>The lesson.</Strong> In the lower tiers, consistency matters far more than brilliance. Five
              steady days in a row beat three perfect ones and a miss.
            </>,
          ]}
        />
      </Section>

      <Section heading="Tips for climbing">
        <BulletList
          items={[
            "Play a little every day rather than a lot on one. Missed days, not low scores, are what hold most players back.",
            "Check your targets early in the day — the hub and the Today card on the board show minutes and rounds so far.",
            "Use the free hints in Stone and Iron; from Copper up, save coins for boards where several words fit.",
            "Finish the rounds you start. An abandoned board scores zero, just like a loss.",
            "Remember the reset is at midnight IST, which may not be midnight where you live.",
          ]}
        />
        <P>
          See who&apos;s leading each tier on the <GuideLink href="/leaderboard/infinite">Infinite leaderboard</GuideLink>
          , and sharpen your solving with the <GuideLink href="/guides/solving-strategy">strategy guide</GuideLink>.
        </P>
      </Section>
    </GuideLayout>
  );
}
