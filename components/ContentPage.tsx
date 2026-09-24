import type { ReactNode } from "react";

/** Shared shell for the public info pages (how-to-play, about, faq,
 * privacy-policy, terms, contact) — the header/footer come from
 * app/(info)/layout.tsx; this just lays out the hero + card sections,
 * matching the "GuessWord Info Pages" design. */
export default function ContentPage({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-270 flex-col gap-16 px-5 py-9 md:px-14 md:py-20">
      <div className="flex max-w-160 flex-col gap-4">
        <h1 className="text-[34px] font-light leading-[1.04] tracking-[-0.03em] md:text-[60px]">{title}</h1>
        {subtitle && <p className="text-[15px] leading-relaxed text-[#c9bfcc] md:text-[17px]">{subtitle}</p>}
      </div>

      <div className="flex flex-col gap-16">{children}</div>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-[#9a8aa2]">{children}</span>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <Eyebrow>{heading}</Eyebrow>
      <div className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-white/4 p-6.5 text-[15px] leading-relaxed text-[#c9bfcc] md:p-7">
        {children}
      </div>
    </section>
  );
}

export function BulletList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2 pl-5">
      {items.map((item, i) => (
        <li key={i} className="list-disc">
          {item}
        </li>
      ))}
    </ul>
  );
}
