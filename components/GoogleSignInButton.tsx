"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiRequestError } from "@/lib/api";

interface GoogleCredentialResponse {
  credential: string;
}

interface PromptMomentNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          prompt: (momentListener?: (notification: PromptMomentNotification) => void) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; text?: string; width?: number },
          ) => void;
        };
      };
    };
  }
}

const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

// Google Identity Services (GIS) — module-level so every button on the page
// shares one script load instead of racing to inject it multiple times.
let gsiLoadPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiLoadPromise) {
    gsiLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Failed to load Google Sign-In")));
        return;
      }
      const script = document.createElement("script");
      script.src = GSI_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Sign-In"));
      document.head.appendChild(script);
    });
  }
  return gsiLoadPromise;
}

function GoogleGIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4 flex-none">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.617z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.183l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
    </svg>
  );
}

/**
 * Styled to match the passkey button (border + bg-surface pill) rather than
 * Google's own rendered widget, which is a cross-origin iframe that can't be
 * restyled. Clicking it calls prompt() directly — same idToken result as the
 * official button, via the callback registered in initialize().
 *
 * Google's own guidance notes prompt() can be silently skipped (rate-limited,
 * recently dismissed, browser doesn't support the required storage access,
 * etc.) — isNotDisplayed()/isSkippedMoment() catch that, and we fall back to
 * rendering Google's official button so sign-in is still always possible.
 *
 * Works for both new and returning users: the backend auto-links a Google
 * identity to an existing email/password account with the same email, so
 * this same component is used on both the login and signup screens.
 */
export default function GoogleSignInButton({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const { loginWithGoogle } = useAuth();
  const fallbackContainerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  // Kept current every render without re-triggering the init effect below —
  // only loginWithGoogle (a stable useCallback) needs to be in its deps.
  const handlersRef = useRef({ onSuccess, onError });
  useEffect(() => {
    handlersRef.current = { onSuccess, onError };
  }, [onSuccess, onError]);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      console.error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set — Google Sign-In button will not render.");
      return;
    }

    let cancelled = false;

    async function handleCredential(response: GoogleCredentialResponse) {
      try {
        await loginWithGoogle(response.credential);
        handlersRef.current.onSuccess();
      } catch (err) {
        handlersRef.current.onError(
          err instanceof ApiRequestError ? err.message : "Google sign-in failed, please try again",
        );
      }
    }

    loadGsiScript()
      .then(() => {
        if (cancelled || !window.google) return;
        window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
        setReady(true);
      })
      .catch((err) => {
        if (!cancelled) console.error(err);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, loginWithGoogle]);

  // Only rendered once we've fallen back — Google's widget needs a real DOM
  // node to mount into, so this can't happen until that node exists.
  useEffect(() => {
    if (!fallback || !fallbackContainerRef.current || !window.google) return;
    window.google.accounts.id.renderButton(fallbackContainerRef.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      width: 320,
    });
  }, [fallback]);

  if (!clientId) return null;

  if (fallback) {
    return <div ref={fallbackContainerRef} className="flex justify-center" />;
  }

  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() => {
        window.google?.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setFallback(true);
          }
        });
      }}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface py-3 text-sm font-medium transition-all duration-150 hover:border-accent/30 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
    >
      <GoogleGIcon /> Continue with Google
    </button>
  );
}
