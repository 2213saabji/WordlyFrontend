import type { Metadata, Viewport } from "next";
import { Sora, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ScreenProvider } from "@/lib/screen-context";
import Nav from "@/components/Nav";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://www.guessword.games";
const SITE_NAME = "GuessWord";
const TITLE = "GuessWord — Free Daily Word Guessing Game";
const DESCRIPTION =
  "Guess the secret five-letter word in six tries. Play a new puzzle every day, practice with unlimited rounds in Infinite mode, and compete with friends on group and global leaderboards — free, no download required.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "guess word",
    "guess game",
    "word game",
    "daily word puzzle",
    "guess the word",
    "word guessing game",
    "five letter word game",
    "wordle alternative",
    "word game with friends",
    "online word puzzle",
    "free word game",
  ],
  category: "games",
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
// from Google rather than helping ranking.
const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: DESCRIPTION,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    genre: "Word Game",
    inLanguage: "en",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do you play GuessWord?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Guess the five-letter word in six tries. Each guess must be a real word. After each guess, tiles turn green for a letter that's in the correct spot, amber for a letter that's in the word but the wrong spot, and gray for a letter that isn't in the word at all.",
        },
      },
      {
        "@type": "Question",
        name: "Is GuessWord free to play?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, GuessWord is completely free to play, with no download required.",
        },
      },
      {
        "@type": "Question",
        name: "Is there a new GuessWord puzzle every day?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, a new daily word is available every day at midnight UTC, plus an unlimited Infinite mode for practicing with a fresh random word any time.",
        },
      },
      {
        "@type": "Question",
        name: "Can I play GuessWord with friends?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes — create or join a group to compare daily and weekly results with friends on a shared leaderboard, alongside the global leaderboard.",
        },
      },
    ],
  },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <AuthProvider>
          <ScreenProvider>
            <Nav />
            <main className="flex flex-1 flex-col">{children}</main>
          </ScreenProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
