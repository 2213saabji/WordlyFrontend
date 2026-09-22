"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
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
    try {
      const { user } = await api.getMe();
      setUser(user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    async function bootstrap() {
      if (getStoredDeviceId()) {
        // A device that's been here before — silently trade the stored
        // deviceId for a fresh access token, no password prompt.
        const result = await api.refreshSession();
        if (result) {
          setUser(result.user);
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

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login({ email, password });
    setToken(data.token);
    setUser(data.user);
    // Best-effort, never blocks the login that already succeeded — see
    // silentlyEnrollPasskey below.
    void silentlyEnrollPasskey();
  }, []);

  const signup = useCallback(
    async (username: string, email: string, password: string) => {
      const data = await api.signup({ username, email, password });
      setToken(data.token);
      setUser(data.user);
      void silentlyEnrollPasskey();
    },
    [],
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
        logout,
        refreshUser,
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
