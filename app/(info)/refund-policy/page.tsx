import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Refunds & Cancellations",
  description:
    "GuessWord's refund and cancellation policy for coin purchases — no cancellations, and refunds only when a payment gets stuck and your coins aren't added.",
  path: "/refund-policy",
});

const LINK = "text-accent underline hover:no-underline";

// Keep in step with the "Coins and purchases" section of the terms
// (app/(info)/terms/page.tsx) — both describe the same refund rules.
// The stuck-payment cases mirror the backend's order flow
// (WordlyBackend docs/COINS_HINTS_CONTRACT.md): a late capture is still
// credited, while a mismatched amount or a second capture on an already
// credited order never is — those are the ones that need a refund.
const SECTIONS: LegalSection[] = [
  {
    id: "what-you-pay-for",
    number: "01",
    heading: "What you pay for",
    body: "GuessWord sells coin packs, an in-game currency you can spend on hints. Coins are a digital item: nothing is shipped, and they're added to your account as soon as your payment is confirmed. Every purchase is a one-time payment, with the price shown in rupees, inclusive of GST, before you pay. There are no subscriptions, memberships or auto-renewals.",
  },
  {
    id: "cancellations",
    number: "02",
    heading: "Cancellations",
    body: "We don't offer cancellations. There's nothing recurring to cancel, and coins are delivered the moment a payment goes through, so a completed purchase can't be cancelled or reversed. If you change your mind before paying, just close the checkout — no money is taken.",
  },
  {
    id: "refunds",
    number: "03",
    heading: "Refunds",
    body: "Coin purchases are non-refundable. That includes coins you haven't spent, coins already spent on hints, and purchases made by mistake or that you no longer want. The only exception is a stuck payment, where money leaves your account but the coins are never added — for example the payment fails or stays pending after your bank has debited you, or you're charged more than once for the same order. In that case you get a full refund. This doesn't affect any refund the law entitles you to.",
  },
  {
    id: "stuck-payments",
    number: "04",
    heading: "If a payment gets stuck",
    body: "Most stuck payments sort themselves out. If your payment is confirmed late, the coins are still added to your account automatically. If a payment fails after your bank has debited you, your bank or the payment gateway normally returns the money on its own within 5–7 working days. If money has left your account, the coins aren't in your balance after 24 hours and the money hasn't come back, contact us and we'll refund the full amount.",
  },
  {
    id: "how-to-request-a-refund",
    number: "05",
    heading: "How to request a refund",
    body: (
      <>
        Email{" "}
        <a href="mailto:support@guessword.games" className={LINK}>
          support@guessword.games
        </a>{" "}
        within 30 days of the payment with the email address on your GuessWord account, the date and amount, and the
        order ID, payment ID or UPI reference from your receipt or bank statement. We reply within two working days
        and check the payment with the gateway before approving the refund.
      </>
    ),
  },
  {
    id: "refund-timeline",
    number: "06",
    heading: "Refund timeline",
    body: "Approved refunds are for the full amount and go back to the original payment method (the same UPI account, card or bank account) within 5–7 working days of approval. Your bank may take a little longer to show it on your statement.",
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Refunds & cancellations"
      lastUpdated="14 October 2026"
      readTime="3 min read"
      intro="This policy covers coin purchases on GuessWord, operated by Gurpreet Singh, an individual developer in India. In short: purchases can't be cancelled, and we refund only when a payment gets stuck — money is taken but your coins are never added."
      sections={SECTIONS}
    />
  );
}
