import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms that apply to using GuessWord — your account, fair play on leaderboards, display and group names, and how the service may change.",
  path: "/terms",
});

const SECTIONS: LegalSection[] = [
  {
    id: "your-account",
    number: "01",
    heading: "Your account",
    body: "You are responsible for keeping your password safe and for activity on your account. Tell us straight away if you think someone else has access.",
  },
  {
    id: "fair-play",
    number: "02",
    heading: "Fair play",
    body: "Don't use bots, scripts, or shared answers to climb leaderboards. We may remove results or accounts that break this rule.",
  },
  {
    id: "names-and-groups",
    number: "03",
    heading: "Names and groups",
    body: "Display names and group names must not be offensive or impersonate others. We may rename or remove them if they do.",
  },
  {
    id: "the-service",
    number: "04",
    heading: "The service",
    body: "We work to keep GuessWord available, but it may occasionally be down for maintenance. Features may change over time.",
  },
  {
    id: "ending-your-use",
    number: "05",
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
    number: "06",
    heading: "Changes to these terms",
    // Dropped "and let you know in the app" from the mockup's copy — there's
    // no in-app notification system to actually do that.
    body: "If we make important changes, we will update the date at the top of this page.",
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of use"
      lastUpdated="25 September 2026"
      readTime="5 min read"
      intro="These terms apply when you use GuessWord, operated by Gurpreet Singh, an individual developer, and governed by the laws of India. By creating an account or playing, you agree to them."
      sections={SECTIONS}
    />
  );
}
