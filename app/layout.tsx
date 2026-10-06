import type { Metadata, Viewport } from "next";
import { Sora, Geist_Mono, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { JsonLd, SITE_NAME, SITE_URL } from "@/lib/seo";

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

// Public by design — it's in every page's HTML and in /ads.txt.
const ADSENSE_CLIENT = "ca-pub-8265077911145583";

const TITLE ="GuessWord — Free Daily Word Guessing Game";
const DESCRIPTION =
  "Guess the secret five-letter word in six tries. Play a new puzzle every day, climb eight Infinite tiers from Stone to Diamond, and compete with friends on group and global leaderboards — free, no download required.";

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
  // AdSense site verification — the ad script itself isn't in the server
  // HTML any more (it loads after hydration; see RootLayout).
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
            "/" and "/home") is always its "checking your session" loader. A
            returning player with a cached session (lib/cache.ts) gets that
            placeholder hidden before first paint instead of flashing it
            until hydration, when AuthProvider swaps in the cached user. Must
            match the check in AuthProvider's bootstrap. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("guessword_device_id")&&localStorage.getItem("guessword_cache:user"))document.documentElement.setAttribute("data-cached-session","")}catch(e){}})()`,
          }}
        />
      </head>
      {/* Third-party scripts (AdSense, its consent message) and browser
          extensions add attributes to <body> before React hydrates. This only
          ignores <body>'s own attributes — its children are still checked. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Google AdSense ads. The root layout wraps every URL, so this one
            tag covers every page. Publisher ID matches public/ads.txt.
            Loaded after hydration (next/script's default): as a plain <head>
            tag it could run first and insert its own <script> into <head>,
            which React then hit in place of the inline script above — a
            hydration mismatch that re-rendered the whole page. Site
            verification is the google-adsense-account meta tag instead. */}
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <JsonLd data={structuredData} />
        {children}
      </body>
    </html>
  );
}
