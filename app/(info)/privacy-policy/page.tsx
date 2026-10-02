import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How GuessWord collects, uses, and protects your information — what we store, payments, what other players can see, cookies, data retention, and your choices.",
  path: "/privacy-policy",
});

const LINK = "text-accent underline hover:no-underline";

const SECTIONS: LegalSection[] = [
  {
    id: "what-we-collect",
    number: "01",
    heading: "What we collect",
    // Signup location: backend utils/geo.js (country + first-level region
    // from the hosting edge's IP lookup; the IP itself isn't kept for it).
    // Game IP: Game.clientIp, saved with each game alongside the device ID.
    body:
      "Your email address and password (stored hashed) — or your Google account's email and name if you sign in with Google instead — plus the display name you choose, your game results, and the groups you create or join. When you create your account we record the country and state or region you signed up from (for example India, Rajasthan), worked out from your IP address by our hosting provider; we don't record your city or exact location. We also store a random device ID in your browser, the IP address each game is played from, and, for Infinite mode, when you start each word and make each guess (used to work out your time played), the rounds you complete, your points, your tier and your coins. We don't collect your phone number.",
  },
  {
    id: "how-we-use-it",
    number: "02",
    heading: "How we use it",
    body:
      "To run the game: saving your progress and streaks, ranking group and Infinite tier leaderboards, checking your daily Infinite targets, keeping you signed in on your device, spotting cheating and duplicate accounts, understanding which countries and regions our players come from (only ever counted in totals, never shown to other players), and sending account emails such as signup verification codes, password resets and purchase receipts. We do not sell your information.",
  },
  {
    id: "coins-and-payments",
    number: "03",
    heading: "Coins and payments",
    body: "Coin purchases are processed by Razorpay. We store the order, the coins bought, the amount and Razorpay's order and payment IDs, and your coin balance and coin history — never your card, UPI or bank details, which go straight to Razorpay. There's no cash reward any more, so we no longer verify mobile numbers or collect bank account details. Any we stored for the earlier Diamond reward are being deleted: mobile numbers within 30 days of this change, and bank details as soon as any payout still owed has been paid.",
  },
  {
    id: "what-others-can-see",
    number: "04",
    heading: "What others can see",
    body:
      "Members of your groups see your display name and results for the daily word, and other players can see your display name and results on the global daily and weekly leaderboards. The Infinite leaderboard is public: anyone, even without an account, can see your display name, points and days in your tier. Your email address and location are never shown to other players.",
  },
  {
    id: "cookies",
    number: "05",
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
    number: "06",
    heading: "Keeping your data",
    body: "We keep your account and game data while your account is active. There's no self-serve deletion in the app yet — email support and we'll delete your account and data.",
  },
  {
    id: "your-choices",
    number: "07",
    heading: "Your choices",
    body: "You can update your display name at any time in the app, and can contact support with any question, correction, or deletion request.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy policy"
      lastUpdated="3 October 2026"
      readTime="4 min read"
      intro="This page explains what information GuessWord collects, why we collect it and the choices you have."
      sections={SECTIONS}
    />
  );
}
