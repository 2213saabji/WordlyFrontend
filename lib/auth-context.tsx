"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import * as api from "@/lib/api";
import {
  clearDeviceId,
  clearToken,
  getDeviceId,
  getStoredDeviceId,
  getToken,
  setDeviceId,
  setToken,
} from "@/lib/api";
import { clearCache, readCache, writeCache } from "@/lib/cache";
import { invalidate, isFresh, markFresh, onStale, runSync, setSyncUser } from "@/lib/sync";
import type { AuthResponse, SignupPendingResponse, User } from "@/types";

const USER_CACHE_KEY = "user";
// Longest the app waits on the startup /auth/refresh before showing the
// sign-in screen (the refresh keeps going in the background).
const REFRESH_WAIT_MS = 4_000;

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Step 1 of signup: emails a code + link, creates nothing and logs no
   * one in. Resolves with the (lowercased) email to verify. */
  signup: (username: string, email: string, password: string) => Promise<SignupPendingResponse>;
  /** Step 2 of signup (code typed in the app): creates the account and logs
   * this device in, exactly like login. */
  verifySignupCode: (email: string, code: string) => Promise<void>;
  /** Step 2 of signup (emailed link, /verify-signup/:token). Single use. */
  verifySignupLink: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  /** Applies the server's returned user object directly (it trims whitespace
   * and re-validates length before saving) rather than the raw typed value —
   * see api.updateUsername. */
  updateUsername: (username: string) => Promise<void>;
  /** Browser/OS-level WebAuthn support — gate any passkey UI behind this. */
  passkeySupported: boolean;
  /** Recovery login: no stored deviceId needed, re-establishes one from the
   * server on success. See the Passkey API doc's "Recovery" flow. */
  loginWithPasskey: () => Promise<void>;
  /** Same endpoint handles both sign-up and sign-in for a Google identity
   * (the backend auto-links by email) — one call for both flows, no
   * separate "is this a new user" branch needed here. */
  loginWithGoogle: (idToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Re-fetches the current user without touching the session itself — used
  // after actions that change stats (finishing a game, etc), not for login.
  const refreshUser = useCallback(async () => {
    const startedAt = Date.now();
    try {
      const { user } = await api.getMe();
      setUser(user);
      markFresh("me", USER_CACHE_KEY, startedAt);
    } catch {
      setUser(null);
    }
  }, []);

  // /sync (lib/sync.ts): the token belongs to the signed-in account, and
  // signing in (or app start with a session) always syncs. A layout effect
  // so it starts before the first screen's own requests (plain effects).
  const userId = user?.id ?? null;
  useLayoutEffect(() => {
    setSyncUser(userId);
    if (userId) void runSync({ force: true });
  }, [userId]);

  // `me` changed (rename, stats, groups, tier badge — maybe on another
  // device): refetch the user. A failure here keeps the session and the
  // stale mark, unlike refreshUser's.
  useEffect(() => {
    return onStale((flags) => {
      if (!flags.has("me") || !userId || isFresh("me", USER_CACHE_KEY)) return;
      const startedAt = Date.now();
      api
        .getMe()
        .then(({ user }) => {
          setUser(user);
          markFresh("me", USER_CACHE_KEY, startedAt);
        })
        .catch(() => {});
    });
  }, [userId]);

  // Layout effect, not a plain effect: the server can't see localStorage, so
  // the first render is always `loading` — this swaps in the cached user
  // before the browser paints, instead of flashing the loader for the
  // length of an /auth/refresh round-trip on every reload.
  useLayoutEffect(() => {
    async function bootstrap() {
      if (getStoredDeviceId()) {
        // A device that's been here before — silently trade the stored
        // deviceId for a fresh access token, no password prompt. Started
        // before anything awaits, so screens' own requests queue behind it
        // (see performRequest in lib/api.ts).
        const refreshStartedAt = Date.now();
        const refreshing = api.refreshSession();
        // Show the last-known user immediately and revalidate below.
        const cached = readCache<User>(USER_CACHE_KEY);
        if (cached) {
          setUser(cached);
          setLoading(false);
        }
        // No cached user to show: don't hold everyone on "Loading…" for a
        // slow refresh (a backend cold start can take 10–20 s). After a few
        // seconds show the sign-in screen; if the refresh then succeeds, the
        // user is swapped in below.
        const giveUp = cached ? undefined : window.setTimeout(() => setLoading(false), REFRESH_WAIT_MS);
        const result = await refreshing;
        window.clearTimeout(giveUp);
        if (result) {
          setUser(result.user);
          // /auth/refresh returns the same user as /auth/me.
          markFresh("me", USER_CACHE_KEY, refreshStartedAt);
          setLoading(false);
          return;
        }
        // This device was logged out (or the session is otherwise gone).
        clearDeviceId();
      } else if (getToken()) {
        // Legacy pre-device-session access token (from before this flow
        // shipped) — keep using it until the server rejects it.
        try {
          const { user } = await api.getMe();
          setUser(user);
          setLoading(false);
          return;
        } catch {
          clearToken();
        }
      }
      setUser(null);
      setLoading(false);
    }
    bootstrap();
  }, []);

  // Keeps the cache in step with the session: the latest user is what the
  // next reload renders first, and every cached screen's data goes with the
  // session when it ends, so nothing leaks into the next account.
  useEffect(() => {
    if (loading) return;
    if (user) writeCache(USER_CACHE_KEY, user);
    else clearCache();
  }, [user, loading]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login({ email, password });
    setToken(data.token);
    // Only now is the deviceId stored (see getDeviceId).
    setDeviceId(data.deviceId || getDeviceId());
    setUser(data.user);
    // Best-effort, never blocks the login that already succeeded — see
    // silentlyEnrollPasskey below.
    void silentlyEnrollPasskey();
  }, []);

  const signup = useCallback(
    (username: string, email: string, password: string) => api.signup({ username, email, password }),
    [],
  );

  // A verified signup returns the same token + deviceId + user as login.
  // The deviceId is stored too: the link may be opened on a device that has
  // never been here.
  const startSession = useCallback((data: AuthResponse) => {
    setToken(data.token);
    setDeviceId(data.deviceId);
    setUser(data.user);
    void silentlyEnrollPasskey();
  }, []);

  const verifySignupCode = useCallback(
    async (email: string, code: string) => startSession(await api.verifySignupCode(email, code)),
    [startSession],
  );

  const verifySignupLink = useCallback(
    async (token: string) => startSession(await api.verifySignupLink(token)),
    [startSession],
  );

  const logout = useCallback(() => {
    // Best-effort server-side revocation before clearing local state — do it
    // first since it needs the still-valid access token. Local logout must
    // succeed regardless of whether this call does (offline, token already
    // expired, etc), so it's fire-and-forget.
    api.logoutDevice().catch(() => {});
    clearToken();
    clearDeviceId();
    setUser(null);
  }, []);

  const updateUsername = useCallback(async (username: string) => {
    const { user } = await api.updateUsername(username);
    setUser(user);
    // The new name shows on every board and group list.
    invalidate("daily", "weekly", "infiniteBoard", "mine");
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const deviceId = getDeviceId();
    const data = await api.googleAuth({ idToken, deviceId });
    setToken(data.token);
    setDeviceId(data.deviceId);
    setUser(data.user);
  }, []);

  const loginWithPasskey = useCallback(async () => {
    const options = await api.webauthnAuthenticateOptions();
    const response = await startAuthentication({ optionsJSON: options });
    const data = await api.webauthnAuthenticateVerify(response);
    // The server hands back the deviceId this passkey was originally
    // registered under — persist it exactly like a fresh login, then normal
    // /auth/refresh resumes as usual from here on.
    setToken(data.token);
    setDeviceId(data.deviceId);
    setUser(data.user);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        verifySignupCode,
        verifySignupLink,
        logout,
        refreshUser,
        updateUsername,
        passkeySupported: browserSupportsWebAuthn(),
        loginWithPasskey,
        loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

/**
 * Folded into login/signup instead of a separate "enable passkey" action —
 * still shows the native OS prompt (that part can't be skipped, by design;
 * see the Passkey API doc), but there's no extra button in our own UI for
 * it. Best-effort: a declined/failed/unsupported prompt never affects the
 * login that already succeeded, and a device that's already enrolled isn't
 * re-prompted (e.g. re-entering a password on an already-logged-in device,
 * which the auth doc notes "just re-activates" the session).
 */
async function silentlyEnrollPasskey(): Promise<void> {
  if (!browserSupportsWebAuthn()) return;
  try {
    const deviceId = getDeviceId();
    const { devices } = await api.getWebauthnDevices();
    if (devices.some((d) => d.deviceId === deviceId)) return;
    const options = await api.webauthnRegisterOptions(deviceId);
    const response = await startRegistration({ optionsJSON: options });
    await api.webauthnRegisterVerify(deviceId, response);
  } catch {
    // Cancelled prompt, unsupported authenticator, offline, whatever —
    // silent by design, the user is already logged in regardless.
  }
}
