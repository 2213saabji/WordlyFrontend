import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/LegalPage";
import { INFINITE_TIERS_ENABLED } from "@/lib/flags";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How GuessWord collects, uses, and protects your information — what we store, what other players can see, cookies, data retention, and your choices.",
  path: "/privacy-policy",
});

const LINK = "text-accent underline hover:no-underline";

const SECTIONS: LegalSection[] = [
  {
    id: "what-we-collect",
    number: "01",
    heading: "What we collect",
    body: INFINITE_TIERS_ENABLED
      ? "Your email address and password (stored hashed) — or your Google account's email and name if you sign in with Google instead — plus the display name you choose, your game results, and the groups you create or join. We also store a random device ID in your browser, and, for Infinite mode, when you start each word and make each guess (used to work out your time played), the rounds you complete, your points and your tier."
      : "Your email address and password (stored hashed) — or your Google account's email and name if you sign in with Google instead — plus the display name you choose, your game results, and the groups you create or join.",
  },
  {
    id: "how-we-use-it",
    number: "02",
    heading: "How we use it",
    body: INFINITE_TIERS_ENABLED
      ? "To run the game: saving your progress and streaks, ranking group and Infinite tier leaderboards, checking your daily Infinite targets, keeping you signed in on your device, spotting cheating and duplicate accounts, and sending account emails such as signup verification codes and password resets. We do not sell your information."
      : "To run the game: saving your progress and streaks, ranking group leaderboards, and sending account emails such as password resets. We do not sell your information.",
  },
  {
    id: "what-others-can-see",
    number: "03",
    heading: "What others can see",
    body: INFINITE_TIERS_ENABLED
      ? "Members of your groups see your display name and results for the daily word, and other players can see your display name and results on the global daily and weekly leaderboards. The Infinite leaderboard is public: anyone, even without an account, can see your display name, points and days in your tier. Your email address is never shown to other players."
      : "Members of your groups see your display name and results for the daily word, and other players can see your display name and results on the global daily and weekly leaderboards. Your email address is never shown to other players.",
  },
  {
    id: "cookies",
    number: "04",
    heading: "Cookies",
    // Covers the disclosures AdSense requires of every site showing its ads.
    body: (
      <>
        GuessWord itself doesn&apos;t use cookies — your signed-in session is kept in your browser&apos;s local
        storage instead. We show ads through Google AdSense. Third-party vendors, including Google, use cookies to
        serve ads based on your prior visits to this website and other websites, and Google&apos;s use of advertising
        cookies enables it and its partners to serve ads to you based on those visits. You can opt out of
        personalized advertising in{" "}
        <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className={LINK}>
          Google&apos;s Ads Settings
        </a>
        , or opt out of other vendors&apos; cookies at{" "}
        <a href="https://www.aboutads.info/choices" target="_blank" rel="noopener noreferrer" className={LINK}>
          aboutads.info
        </a>
        . To learn more, see{" "}
        <a
          href="https://policies.google.com/technologies/partner-sites"
          target="_blank"
          rel="noopener noreferrer"
          className={LINK}
        >
          how Google uses data when you use our partners&apos; sites
        </a>
        . Visitors in the European Economic Area, the UK and Switzerland are asked for consent before any
        advertising cookies are set, and can change their choice at any time.
      </>
    ),
  },
  {
    id: "keeping-your-data",
    number: "05",
    heading: "Keeping your data",
    body: "We keep your account and game data while your account is active. There's no self-serve deletion in the app yet — email support and we'll delete your account and data.",
  },
  {
    id: "your-choices",
    number: "06",
    heading: "Your choices",
    body: "You can update your display name at any time in the app, and can contact support with any question, correction, or deletion request.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy policy"
      lastUpdated="28 September 2026"
      readTime="4 min read"
      intro="This page explains what information GuessWord collects, why we collect it and the choices you have."
      sections={SECTIONS}
    />
  );
}
