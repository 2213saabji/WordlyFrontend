import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch about GuessWord — bug reports, word suggestions, or account help.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto flex w-full max-w-270 px-5 py-9 md:px-14 md:py-20">
      <div className="flex w-full flex-wrap items-start gap-10 md:gap-20">
        <div className="flex flex-1 flex-col gap-7 basis-70" style={{ maxWidth: 400 }}>
          <div className="flex flex-col gap-4">
            <span className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-[#9a8aa2]">Contact</span>
            <h1 className="text-[34px] font-light leading-[1.04] tracking-[-0.03em] md:text-[54px]">
              Say <strong className="font-bold">hello.</strong>
            </h1>
            <p className="text-[15.5px] leading-relaxed text-[#c9bfcc]">
              Bug reports, word suggestions, account help. We usually reply within two working days.
            </p>
          </div>
          <div className="flex flex-col border-t border-white/10">
            <div className="flex flex-col gap-1 border-b border-white/10 py-4.5">
              <span className="text-[12.5px] text-[#9a8aa2]">Email</span>
              <span className="text-[15.5px] font-semibold text-accent">support@guessword.games</span>
            </div>
            <div className="flex flex-col gap-1 border-b border-white/10 py-4.5">
              <span className="text-[12.5px] text-[#9a8aa2]">Before you write</span>
              <Link href="/faq" className="text-[15.5px] font-semibold hover:text-accent">
                Check the FAQ →
              </Link>
            </div>
          </div>
        </div>

        <div className="flex-[2_1_400px] rounded-[26px] border border-white/10 bg-[#1f1725] p-6 md:p-8.5">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
