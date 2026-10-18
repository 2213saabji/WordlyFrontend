"use client";

import { useEffect, useState } from "react";

// Google's consent message (AdSense → Privacy & messaging) is served by the
// AdSense script itself (components/AdSenseScript) to visitors in the EEA, the
// UK and Switzerland. Those visitors must be able to change their choice later,
// so this link reopens it — and only shows for visitors the message applies
// to. On routes without the AdSense script the queue never runs, so it stays
// hidden there.

type TcData = { gdprApplies?: boolean } | null;

interface GoogleFc {
  callbackQueue: unknown[];
  showRevocationMessage?: () => void;
}

declare global {
  interface Window {
    googlefc?: GoogleFc;
    __tcfapi?: (command: string, version: number, callback: (data: TcData, success: boolean) => void) => void;
  }
}

/** The script picks this queue up when it loads, so it's safe to push to
 * before it has. */
function googlefcQueue(): unknown[] {
  window.googlefc ??= { callbackQueue: [] };
  window.googlefc.callbackQueue ??= [];
  return window.googlefc.callbackQueue;
}

export default function ConsentSettingsLink({ className }: { className?: string }) {
  const [applies, setApplies] = useState(false);

  useEffect(() => {
    googlefcQueue().push({
      CONSENT_DATA_READY: () =>
        window.__tcfapi?.("getTCData", 2, (data, success) => {
          if (success && data?.gdprApplies) setApplies(true);
        }),
    });
  }, []);

  if (!applies) return null;
  return (
    <button
      type="button"
      onClick={() => googlefcQueue().push(() => window.googlefc?.showRevocationMessage?.())}
      className={`text-left ${className ?? ""}`}
    >
      Privacy &amp; cookie settings
    </button>
  );
}
