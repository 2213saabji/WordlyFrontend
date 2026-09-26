// Account auth: email/password, Google, device-session logout and password
// reset. The silent-login call (refreshSession) lives in ./client since
// every authed request depends on it.

import type { AuthResponse, User } from "@/types";
import { apiFetch, getDeviceId } from "./client";

export function signup(payload: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch("/auth/signup", {
    method: "POST",
    body: { ...payload, deviceId: getDeviceId() },
    skipAuth: true,
  });
}

export function login(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiFetch("/auth/login", {
    method: "POST",
    body: { ...payload, deviceId: getDeviceId() },
    skipAuth: true,
  });
}

export function getMe(): Promise<{ user: User }> {
  return apiFetch("/auth/me");
}

/** The backend trims whitespace and re-validates length (2-30 chars) server
 * side before saving, so the returned user object — not the raw input — is
 * the actual saved value; callers should apply that object rather than
 * optimistically setting the name from what was typed. */
export function updateUsername(username: string): Promise<{ user: User }> {
  return apiFetch("/auth/username", { method: "PATCH", body: { username } });
}

/** idToken is the signed JWT credential from Google Identity Services — the
 * backend verifies it against Google itself, so nothing decoded from it
 * client-side (email, name, ...) is ever sent instead. Same deviceId scheme
 * as login/signup; the backend auto-links this Google identity to an
 * existing email/password account with the same email. */
export function googleAuth(payload: { idToken: string; deviceId: string }): Promise<AuthResponse> {
  return apiFetch("/auth/google", {
    method: "POST",
    body: payload,
    skipAuth: true,
  });
}

/** Revokes this device's session server-side. Requires the current access
 * token, so call it before clearing local state. */
export function logoutDevice(): Promise<{ message: string }> {
  return apiFetch("/auth/logout", { method: "POST", body: { deviceId: getDeviceId() } });
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return apiFetch("/auth/forgot-password", {
    method: "POST",
    body: { email },
    skipAuth: true,
  });
}

export function resetPassword(
  token: string,
  password: string,
): Promise<{ message: string }> {
  return apiFetch(`/auth/reset-password/${token}`, {
    method: "POST",
    body: { password },
    skipAuth: true,
  });
}
