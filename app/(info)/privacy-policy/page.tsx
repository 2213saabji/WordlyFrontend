import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How GuessWord collects, uses, and protects your information — what we store, what other players can see, cookies, data retention, and your choices.",
  path: "/privacy-policy",
});

const SECTIONS: LegalSection[] = [
  {
    id: "what-we-collect",
    number: "01",
    heading: "What we collect",
    body: "Your email address and password (stored hashed) — or your Google account's email and name if you sign in with Google instead — plus the display name you choose, your game results, and the groups you create or join.",
  },
  {
    id: "how-we-use-it",
    number: "02",
    heading: "How we use it",
    body: "To run the game: saving your progress and streaks, ranking group leaderboards, and sending account emails such as password resets. We do not sell your information.",
  },
  {
    id: "what-others-can-see",
    number: "03",
    heading: "What others can see",
    body: "Members of your groups see your display name and results for the daily word. Your email address is never shown to other players.",
  },
  {
    id: "cookies",
    number: "04",
    heading: "Cookies",
    body: (
      <>
        GuessWord itself doesn&apos;t use cookies — your signed-in session is kept in your browser&apos;s local
        storage instead. If we display ads through Google AdSense or use Google Analytics, those services may set
        their own cookies for traffic measurement or ad personalization; you can opt out through{" "}
        <a
          href="https://adssettings.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline hover:no-underline"
        >
          Google&apos;s Ads Settings
        </a>
        .
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
      lastUpdated="25 September 2026"
      readTime="4 min read"
      intro="This page explains what information GuessWord collects, why we collect it and the choices you have."
      sections={SECTIONS}
    />
  );
}
