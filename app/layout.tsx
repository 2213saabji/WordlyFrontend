import type { Metadata, Viewport } from "next";
import { Sora, Geist_Mono, Space_Grotesk } from "next/font/google";
import { ADSENSE_CLIENT } from "@/components/AdSenseScript";
import "./globals.css";
import { HOME_TITLE, JsonLd, SITE_NAME, SITE_URL } from "@/lib/seo";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Numerals only — tier numbers and counters on the Infinite tier screens.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: "700",
});

const TITLE = HOME_TITLE;
const DESCRIPTION =
  "Play GuessWord, the free guess word game: find the secret five-letter word in six tries. A new Daily word, unlimited Infinite rounds and friend groups.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  // Only terms that honestly describe the game — Google ignores this tag for
  // ranking anyway; the page copy itself carries these phrases naturally.
  keywords: [
    "GuessWord",
    "guess the word",
    "word guessing game",
    "word game",
    "daily word game",
    "online word game",
    "free word game",
    "word puzzle",
    "vocabulary game",
    "unlimited word game",
    "word game leaderboard",
    "word game tiers",
  ],
  category: "games",
  // AdSense site verification, on every page — the ad script itself loads
  // after hydration and only on content routes (components/AdSenseScript).
  other: {
    "google-adsense-account": ADSENSE_CLIENT,
  },
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#17111b",
};

// Plain, verifiable facts only — no fabricated ratings, review counts, or
// publisher identity, since false structured data risks a manual penalty
// from Google rather than helping ranking. FAQPage structured data lives on
// /faq itself instead of here, so it matches the page that actually
// displays those questions.
// WebSite + Organization give search and answer engines a stable entity
// ("GuessWord", this URL, this support email) to attach every page to.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon`,
      email: "support@guessword.games",
      sameAs: [
        "https://x.com/guesswordgames",
        "https://www.pinterest.com/guesswordgames/",
        "https://mastodon.social/@guessword",
        "https://medium.com/@guessword",
        "https://www.producthunt.com/products/guessword",
        "https://guessword.tumblr.com/",
      ],
      founder: { "@type": "Person", name: "Gurpreet Singh" },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@guessword.games",
        url: `${SITE_URL}/contact`,
      },
    },
    {
      "@type": ["WebApplication", "VideoGame"],
      "@id": `${SITE_URL}/#game`,
      name: SITE_NAME,
      url: SITE_URL,
      description: DESCRIPTION,
      applicationCategory: "GameApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript and a modern web browser.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      genre: ["Word Game", "Puzzle"],
      gamePlatform: "Web browser",
      playMode: ["SinglePlayer", "MultiPlayer"],
      inLanguage: "en",
      isAccessibleForFree: true,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
      // The inline script below may add data-cached-session before hydration.
      suppressHydrationWarning
    >
      <head>
        {/* The server can't see localStorage, so the game's server HTML (on
            "/") is always its "checking your session" loader. A
            returning player with a cached session (lib/cache.ts) gets that
            placeholder hidden before first paint instead of flashing it
            until hydration, when AuthProvider swaps in the cached user. Must
            match the check in AuthProvider's bootstrap. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("guessword_device_id")&&localStorage.getItem("guessword_cache:user"))document.documentElement.setAttribute("data-cached-session","")}catch(e){}})()`,
          }}
        />
        {/* Android/desktop Chrome offer to install the site with this event,
            often before React has loaded. Keep it (and stop Chrome's own
            mini-infobar) so lib/install.ts can show our install sheet at a
            good moment instead. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__guesswordInstallPrompt=e;window.dispatchEvent(new Event("guessword:installable"))})`,
          }}
        />
      </head>
      {/* Third-party scripts (AdSense, its consent message) and browser
          extensions add attributes to <body> before React hydrates. This only
          ignores <body>'s own attributes — its children are still checked. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Google AdSense is loaded per route — see components/AdSenseScript. */}
        <JsonLd data={structuredData} />
        {children}
      </body>
    </html>
  );
}
