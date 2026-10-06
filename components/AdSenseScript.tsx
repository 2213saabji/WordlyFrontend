import Script from "next/script";

// Public by design — it's in every page's HTML and in /ads.txt.
export const ADSENSE_CLIENT = "ca-pub-8265077911145583";

/** Google AdSense (auto ads). Rendered only by routes with real content —
 * the info pages and guides, the game on "/" (guest or signed in) and the public
 * leaderboard — never by single-purpose screens such as the reset-password
 * and email-verification links, since AdSense doesn't allow ads on screens
 * without publisher content. Publisher ID matches public/ads.txt; site
 * verification is the google-adsense-account meta tag in app/layout.tsx.
 *
 * Loaded after hydration (next/script's default): as a plain <head> tag it
 * could run first and insert its own <script> into <head>, which React then
 * hit in place of the root layout's inline script — a hydration mismatch
 * that re-rendered the whole page. next/script loads it once per page load,
 * however many routes render this. */
export default function AdSenseScript() {
  return (
    <Script
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
