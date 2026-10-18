import { ImageResponse } from "next/og";

// App icons for the web app manifest (app/manifest.ts) and notifications
// (public/sw.js), drawn like app/icon.tsx: the orange "G" tile.
//   192, 512      rounded tile, for launchers that show the icon as is
//   maskable-512  full bleed, the G inside the central safe zone, for
//                 Android launchers that crop icons to their own shape
//   badge         white G on transparent, for the Android status bar
const VARIANTS = {
  "192": { size: 192, kind: "rounded" },
  "512": { size: 512, kind: "rounded" },
  "maskable-512": { size: 512, kind: "maskable" },
  badge: { size: 96, kind: "badge" },
} as const;

type Variant = keyof typeof VARIANTS;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export const dynamicParams = false;

export async function GET(_request: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  const { size, kind } = VARIANTS[variant as Variant];
  const badge = kind === "badge";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: badge ? "transparent" : "#f2a05c",
          color: badge ? "#ffffff" : "#17111b",
          fontFamily: "sans-serif",
          fontWeight: 700,
          // The maskable G stays well inside the 80% safe zone.
          fontSize: Math.round(size * (kind === "maskable" ? 0.5 : badge ? 0.8 : 0.62)),
          borderRadius: kind === "rounded" ? Math.round(size * 0.22) : 0,
        }}
      >
        G
      </div>
    ),
    { width: size, height: size },
  );
}
