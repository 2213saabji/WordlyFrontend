// Browser push for the daily reminder: the service worker (public/sw.js),
// notification permission, and this browser's subscription on the backend
// (lib/api/reminders.ts). Everything here is best-effort and safe to call on
// browsers without push.

import { addPushSubscription, removePushSubscription } from "@/lib/api";
import type { ReminderSettings } from "@/types";

/** The endpoint this browser registered, kept so logout can remove it
 * synchronously, while the access token is still there. */
const ENDPOINT_KEY = "guessword_push_endpoint";

export type DevicePushState =
  | "on" // permission granted and subscribed
  | "off" // could be turned on
  | "blocked" // the player blocked notifications for the site
  | "needs-install" // iPhone/iPad: push only works from the home-screen app
  | "unsupported";

function readEndpoint(): string | null {
  try {
    return localStorage.getItem(ENDPOINT_KEY);
  } catch {
    return null;
  }
}

function writeEndpoint(endpoint: string | null) {
  try {
    if (endpoint) localStorage.setItem(ENDPOINT_KEY, endpoint);
    else localStorage.removeItem(ENDPOINT_KEY);
  } catch {
    // Storage disabled — logout just won't be able to clean up.
  }
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  // iPadOS reports itself as a Mac; touch points give it away.
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Running as the installed (home-screen) app rather than in a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function hasPushApis(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

let registration: Promise<ServiceWorkerRegistration> | null = null;

/** Registers public/sw.js once per page load. */
export function registerServiceWorker(): Promise<ServiceWorkerRegistration> | null {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  registration ??= navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  registration.catch(() => {
    registration = null;
  });
  return registration;
}

/** What push can do on this browser right now. */
export async function devicePushState(): Promise<DevicePushState> {
  if (isIos() && !isStandalone()) return "needs-install";
  if (!hasPushApis()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  const reg = await registerServiceWorker();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

/** Synchronous best guess, for deciding which button to show before the
 * async state is known. */
export function pushPossibleHere(): boolean {
  if (isIos() && !isStandalone()) return false;
  return hasPushApis() && Notification.permission !== "denied";
}

function base64UrlToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Asks for permission. Call straight from a tap: Safari ignores requests
 * that don't come from one, so don't await anything before it. */
export function requestPermission(): Promise<NotificationPermission> {
  if (!hasPushApis()) return Promise.resolve("denied");
  return Notification.requestPermission();
}

/**
 * Subscribes this browser and saves it on the backend. Permission must
 * already be granted (requestPermission). Returns the updated settings.
 */
export async function subscribeThisDevice(vapidPublicKey: string): Promise<ReminderSettings> {
  const reg = await registerServiceWorker();
  if (!reg) throw new Error("Service workers aren't available");
  await navigator.serviceWorker.ready;
  const applicationServerKey = base64UrlToBytes(vapidPublicKey);

  let sub = await reg.pushManager.getSubscription();
  // A subscription made with an older server key can't be reused.
  if (sub && sub.options.applicationServerKey) {
    const current = new Uint8Array(sub.options.applicationServerKey);
    const same = current.length === applicationServerKey.length && current.every((b, i) => b === applicationServerKey[i]);
    if (!same) {
      await sub.unsubscribe();
      sub = null;
    }
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });

  const json = sub.toJSON();
  const settings = await addPushSubscription({
    endpoint: sub.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
  });
  writeEndpoint(sub.endpoint);
  return settings;
}

/** This browser stops getting reminders (other devices keep theirs). */
export async function unsubscribeThisDevice(): Promise<ReminderSettings | null> {
  const reg = await registerServiceWorker();
  const sub = await reg?.pushManager.getSubscription();
  const endpoint = sub?.endpoint ?? readEndpoint();
  let settings: ReminderSettings | null = null;
  if (endpoint) settings = await removePushSubscription(endpoint);
  await sub?.unsubscribe();
  writeEndpoint(null);
  return settings;
}

/**
 * On logout: removes this browser's subscription from the account, so the
 * next person to use it doesn't get the previous player's reminders. The
 * request starts synchronously, before the caller clears the access token.
 */
export function forgetDeviceOnLogout(): void {
  const endpoint = readEndpoint();
  if (!endpoint) return;
  removePushSubscription(endpoint).catch(() => {});
  writeEndpoint(null);
  void registerServiceWorker()
    ?.then((reg) => reg.pushManager.getSubscription())
    .then((sub) => sub?.unsubscribe())
    .catch(() => {});
}
