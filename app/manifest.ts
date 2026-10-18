import type { MetadataRoute } from "next";

// Makes the site installable ("Add to home screen"): an installed GuessWord
// opens full screen from its own icon, and on iPhone it's also what makes
// push reminders possible at all. Icons come from app/pwa-icon/[variant].
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "GuessWord",
    short_name: "GuessWord",
    description: "Guess the five-letter word in six tries — a new Daily word every day, and Infinite mode to keep going.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#17111b",
    theme_color: "#17111b",
    categories: ["games", "puzzle", "education"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
