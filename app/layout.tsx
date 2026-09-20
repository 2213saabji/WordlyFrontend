import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Wordly",
  description: "A Wordly Game to Guess the Word of the Day",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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
