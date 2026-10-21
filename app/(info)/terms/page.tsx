import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { type LegalSection } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms for using GuessWord — your account, fair play on leaderboards, display and group names, coins and purchases, and how the service may change.",
  path: "/terms",
});

const SECTIONS: LegalSection[] = [
  {
    id: "who-can-use-guessword",
    number: "01",
    heading: "Who can use GuessWord",
    body: "GuessWord is a general-audience word game. You must be at least 13 years old to use it, or older if the law where you live sets a higher age for agreeing to these terms or to the use of your data. If you're under 18, make sure a parent or guardian agrees to these terms for you, and ask them before buying coins.",
  },
  {
    id: "your-account",
    number: "02",
    heading: "Your account",
    body: "You are responsible for keeping your password safe and for activity on your account. Tell us straight away if you think someone else has access.",
  },
  {
    id: "fair-play",
    number: "03",
    heading: "Fair play",
    body: "Don't use bots, scripts, or shared answers to climb leaderboards. We may remove results or accounts that break this rule.",
  },
  {
    id: "names-and-groups",
    number: "04",
    heading: "Names and groups",
    body: "Display names and group names must not be offensive or impersonate others. We may rename or remove them if they do.",
  },
  {
    id: "coins-and-purchases",
    number: "05",
    heading: "Coins and purchases",
    body: (
      <>
        Coins are an in-game currency. You earn them by solving words and can buy more: 3,000 coins for ₹10, or any
        amount from ₹10 to ₹1,000 in steps of ₹10 at the same rate (300 coins per ₹1), inclusive of GST, paid through
        PayU. Coins are delivered digitally: nothing is shipped, and bought coins are added to your account as soon as
        the payment is confirmed. Coins can only be spent in GuessWord, for example on hints. They have
        no cash value, can&apos;t be withdrawn, exchanged or transferred to another account, and don&apos;t expire.
        Purchases are non-refundable, except where the law requires a refund, you were charged twice for the same
        order, or you were charged but the coins were never added. If a payment fails, no coins are added and you
        aren&apos;t charged. See our{" "}
        <Link href="/refund-policy" className="text-accent underline hover:no-underline">
          refunds &amp; cancellations policy
        </Link>{" "}
        for how to request a refund.
      </>
    ),
  },
  {
    id: "the-service",
    number: "06",
    heading: "The service",
    body: "We work to keep GuessWord available, but it may occasionally be down for maintenance. Features may change over time.",
  },
  {
    id: "ending-your-use",
    number: "07",
    heading: "Ending your use",
    // The mockup's copy said "delete your account at any time" — there's no
    // self-serve deletion in the app yet, only via emailing support (see the
    // privacy policy's "Keeping your data" section), so this is corrected to
    // match what's actually true rather than promise a feature that isn't
    // built.
    body: "You can ask us to delete your account at any time by contacting support. We may suspend accounts that break these terms.",
  },
  {
    id: "changes-to-these-terms",
    number: "08",
    heading: "Changes to these terms",
    // Dropped "and let you know in the app" from the mockup's copy — the
    // in-app notifications only carry tier and coin events, not terms
    // updates.
    body: "If we make important changes, we will update the date at the top of this page.",
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of use"
      lastUpdated="21 October 2026"
      readTime="5 min read"
      intro="These terms apply when you use GuessWord, operated by Gurpreet Singh, an individual developer, and governed by the laws of India. By creating an account or playing, you agree to them."
      sections={SECTIONS}
    />
  );
}
