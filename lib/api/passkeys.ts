// Passkeys (WebAuthn).
// Recovery path for when localStorage is cleared and the stored deviceId is
// lost with it — see the Passkey API doc. Enrollment needs an authenticated
// session already; the authenticate/* pair is deliberately public (there's
// no deviceId left to send) — it's how a wiped device gets back in without
// a password.

import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import type { User } from "@/types";
import { apiFetch } from "./client";

export interface WebauthnDevice {
  deviceId: string;
  deviceType: string;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string;
}

export function getWebauthnDevices(): Promise<{ devices: WebauthnDevice[] }> {
  return apiFetch("/auth/webauthn/devices");
}

export function webauthnRegisterOptions(deviceId: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
  return apiFetch("/auth/webauthn/register/options", { method: "POST", body: { deviceId } });
}

export function webauthnRegisterVerify(
  deviceId: string,
  response: RegistrationResponseJSON,
): Promise<{ message: string }> {
  return apiFetch("/auth/webauthn/register/verify", { method: "POST", body: { deviceId, response } });
}

export function webauthnAuthenticateOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  return apiFetch("/auth/webauthn/authenticate/options", { method: "POST", body: {}, skipAuth: true });
}

export function webauthnAuthenticateVerify(
  response: AuthenticationResponseJSON,
): Promise<{ token: string; deviceId: string; user: User }> {
  return apiFetch("/auth/webauthn/authenticate/verify", { method: "POST", body: { response }, skipAuth: true });
}

export function webauthnRevoke(deviceId: string): Promise<{ message: string }> {
  return apiFetch("/auth/webauthn/revoke", { method: "POST", body: { deviceId } });
}
