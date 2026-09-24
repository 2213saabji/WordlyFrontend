import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import type {
  ApiErrorBody,
  AuthResponse,
  Game,
  GlobalDailyLeaderboardResponse,
  GlobalWeeklyLeaderboardResponse,
  Group,
  GroupDailyLeaderboardResponse,
  GroupWeeklyLeaderboardResponse,
  LeaderboardResponse,
  Pagination,
  User,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://wordly-backend-nu.vercel.app/api";

const DEVICE_ID_KEY = "guessword_device_id";
/** Pre-device-session access token key, from before this flow shipped. Read
 * once at startup for migration, then abandoned — see `accessToken` below. */
const LEGACY_TOKEN_KEY = "guessword_token";

// Access tokens are short-lived (1h) and, per the auth flow, intentionally
// NOT persisted — only deviceId needs to survive a reload. The access token
// lives in memory for the life of the tab and is re-obtained via /auth/refresh
// on every app start (and silently on expiry mid-session).
let accessToken: string | null =
  typeof window !== "undefined" ? window.localStorage.getItem(LEGACY_TOKEN_KEY) : null;

export function getToken(): string | null {
  return accessToken;
}

export function setToken(token: string): void {
  accessToken = token;
  // Once we have a real device-session token there's no reason to keep the
  // old single-token key around.
  if (typeof window !== "undefined") window.localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function clearToken(): void {
  accessToken = null;
}

// NOTE on storage: deviceId is now the device's entire standing credential —
// there's no second secret behind it (see the API docs' security trade-off).
// The docs recommend Keychain/Keystore (native) or a secure httpOnly cookie
// (web). A browser SPA calling a separate API origin has no way to receive a
// server-set httpOnly cookie without backend cooperation we don't have here,
// so localStorage is the pragmatic fallback — same tradeoff the rest of this
// scheme already makes. The important discipline (per the docs) is keeping
// it out of logs/analytics, not just out of plain storage.

/** Read-only — never creates one. Used to decide *whether* to attempt a
 * silent login; creating one here would mean silently registering a new,
 * never-authenticated device just by checking. */
export function getStoredDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DEVICE_ID_KEY);
}

/** Returns the stored deviceId, generating and persisting a fresh UUID v4 if
 * none exists yet. Only call this where a deviceId is actually about to be
 * used to establish a session (login/signup) — see getStoredDeviceId(). */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  const existing = getStoredDeviceId();
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

export function clearDeviceId(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(DEVICE_ID_KEY);
}

/** Overwrites the stored deviceId with one the server hands back — used only
 * by passkey recovery, which re-establishes a device's identity server-side
 * after storage was cleared. Unlike getDeviceId(), this never generates one
 * itself. */
export function setDeviceId(id: string): void {
  if (typeof window !== "undefined") window.localStorage.setItem(DEVICE_ID_KEY, id);
}

export class ApiRequestError extends Error {
  status: number;
  data: ApiErrorBody | null;

  constructor(message: string, status: number, data: ApiErrorBody | null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.data = data;
  }
}

interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  skipAuth?: boolean;
  /** Internal — sat after one refresh-and-retry attempt, so a second 401
   * (refresh itself is somehow not fixing it) doesn't loop forever. */
  isRetry?: boolean;
}

const REQUEST_TIMEOUT_MS = 20_000;

/** Thrown when a request is aborted for exceeding REQUEST_TIMEOUT_MS — kept
 * distinct from a plain network failure (offline, DNS, connection refused,
 * ...) so the retry policy below can tell a transient timeout apart from a
 * connection that isn't there at all. */
class ApiTimeoutError extends Error {
  constructor() {
    // User-facing text, deliberately generic — every screen's catch block
    // falls back to this same copy for a non-ApiRequestError anyway, but
    // setting it here means that's true by construction, not convention.
    super("Something went wrong");
    this.name = "ApiTimeoutError";
  }
}

function clearSession(): void {
  clearToken();
  clearDeviceId();
}

function redirectToLogin(): void {
  // The login screen lives at "/" (it's part of the single-page app, not a
  // separate route) — the only other real route is /reset-password/[token],
  // which never makes an authenticated call, so it can't hit this path.
  if (typeof window !== "undefined" && window.location.pathname !== "/") {
    // Plain module outside the React tree (no useRouter here); a hard
    // navigation also clears any in-memory state left over from the expired
    // session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  }
}

// Concurrent 401s during the same tick (a burst of calls right as the access
// token expires) should share one /auth/refresh call rather than firing one
// each — the refresh token itself isn't rotated, so this is purely about not
// being wasteful.
let refreshPromise: Promise<{ token: string; user: User } | null> | null = null;

function ensureRefreshed(): Promise<{ token: string; user: User } | null> {
  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function performRequest<T>(
  path: string,
  { method = "GET", body, skipAuth = false, isRetry = false }: ApiFetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (!skipAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) throw new ApiTimeoutError();
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    if (res.status === 401 && !skipAuth && !isRetry) {
      const refreshed = await ensureRefreshed();
      if (refreshed) {
        return performRequest<T>(path, { method, body, skipAuth, isRetry: true });
      }
      // Stored device session is gone (revoked, or this is a stale
      // pre-device-session token) — there's nothing left to silently retry.
      clearSession();
      redirectToLogin();
    }
    const errorBody = data as ApiErrorBody | null;
    // 5xx bodies are the backend's own internals leaking through (stack
    // traces, DB errors, ...), not user-facing copy — every screen shows
    // this verbatim, so it's overridden here rather than trusted like a 4xx
    // validation message.
    const message = res.status >= 500 ? "Something went wrong" : errorBody?.message ?? "Something went wrong";
    throw new ApiRequestError(message, res.status, errorBody);
  }

  return data as T;
}

/** A 5xx or a timeout is treated as transient and worth one retry. Anything
 * else — a 4xx the server actively rejected (bad request, invalid
 * credentials, validation errors, ...) or a network failure with no
 * response at all (offline, DNS, connection refused) — is final on the
 * first try: retrying won't change a deterministic rejection, and a device
 * with no connectivity won't suddenly have one a moment later. */
function isRetryableFailure(err: unknown): boolean {
  if (err instanceof ApiTimeoutError) return true;
  if (err instanceof ApiRequestError) return err.status >= 500;
  return false;
}

// Every endpoint below funnels through this one function — the project-wide
// policy is "success takes exactly one request; only a 5xx or a timeout
// earns a second attempt, with identical arguments." A second consecutive
// failure is final and reaches the caller as normal.
async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  try {
    return await performRequest<T>(path, options);
  } catch (err) {
    if (!isRetryableFailure(err)) throw err;
    return await performRequest<T>(path, options);
  }
}

// --- Auth ---

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

/** The silent-login call: trades the stored deviceId for a fresh access
 * token, no password needed. Returns null (rather than throwing) whenever
 * there's nothing to try or the device session is gone, since callers treat
 * "couldn't refresh" as a normal, expected outcome. */
export async function refreshSession(): Promise<{ token: string; user: User } | null> {
  const deviceId = getStoredDeviceId();
  if (!deviceId) return null;
  try {
    const data = await apiFetch<{ token: string; user: User }>("/auth/refresh", {
      method: "POST",
      body: { deviceId },
      skipAuth: true,
    });
    setToken(data.token);
    return data;
  } catch {
    return null;
  }
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

// --- Passkeys (WebAuthn) ---
// Recovery path for when localStorage is cleared and the stored deviceId is
// lost with it — see the Passkey API doc. Enrollment needs an authenticated
// session already; the authenticate/* pair is deliberately public (there's
// no deviceId left to send) — it's how a wiped device gets back in without
// a password.

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

// --- Game ---

export function getTodayGame(): Promise<{ game: Game }> {
  return apiFetch("/game/today");
}

export function submitGuess(guess: string): Promise<{ result: number[]; game: Game }> {
  return apiFetch("/game/guess", { method: "POST", body: { guess } });
}

export function getHistory(): Promise<{ games: Game[] }> {
  return apiFetch("/game/history");
}

// --- Infinite mode (unlimited, per-round random word — never touches stats/leaderboards) ---

export function getInfiniteCurrent(): Promise<{ game: Game }> {
  return apiFetch("/game/infinite/current");
}

export function startNewInfiniteRound(): Promise<{ game: Game }> {
  return apiFetch("/game/infinite/new", { method: "POST" });
}

export function submitInfiniteGuess(guess: string): Promise<{ result: number[]; game: Game }> {
  return apiFetch("/game/infinite/guess", { method: "POST", body: { guess } });
}

export function getInfiniteHistory(): Promise<{ games: Game[] }> {
  return apiFetch("/game/infinite/history");
}

// --- Groups ---

export function createGroup(name: string): Promise<{ group: Group }> {
  return apiFetch("/groups", { method: "POST", body: { name } });
}

// Docs describe the response as "the updated group object" without a wrapper,
// but every sibling endpoint wraps in { group }; normalize to accept either.
export async function joinGroup(code: string): Promise<Group> {
  const data = await apiFetch<Group | { group: Group }>(
    `/groups/join/${encodeURIComponent(code)}`,
    { method: "POST" },
  );
  return "group" in data ? data.group : data;
}

export function getMyGroups(options: PageOptions = {}): Promise<{ groups: Group[]; pagination: Pagination }> {
  return apiFetch(`/groups/mine?${pageQuery(options)}`);
}

export function leaveGroup(id: string): Promise<{ message: string }> {
  return apiFetch(`/groups/${id}/leave`, { method: "POST" });
}

interface PageOptions {
  page?: number;
  limit?: number;
}

/** page/limit default to the same values the backend defaults to (1/20) —
 * passed explicitly anyway so the batch size here can't silently drift from
 * what the UI assumes it's getting. */
function pageQuery({ page = 1, limit = 20 }: PageOptions, extra?: Record<string, string | undefined>): string {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export function getLeaderboard(id: string, options: PageOptions = {}): Promise<LeaderboardResponse> {
  return apiFetch(`/groups/${id}/leaderboard?${pageQuery(options)}`);
}

export function getGlobalDailyLeaderboard(
  options: PageOptions & { date?: string } = {},
): Promise<GlobalDailyLeaderboardResponse> {
  return apiFetch(`/leaderboard/daily?${pageQuery(options, { date: options.date })}`);
}

export function getGlobalWeeklyLeaderboard(
  options: PageOptions & { date?: string } = {},
): Promise<GlobalWeeklyLeaderboardResponse> {
  return apiFetch(`/leaderboard/weekly?${pageQuery(options, { date: options.date })}`);
}

export function getGroupDailyLeaderboard(
  id: string,
  options: PageOptions & { date?: string } = {},
): Promise<GroupDailyLeaderboardResponse> {
  return apiFetch(`/groups/${id}/leaderboard/daily?${pageQuery(options, { date: options.date })}`);
}

export function getGroupWeeklyLeaderboard(
  id: string,
  options: PageOptions & { date?: string } = {},
): Promise<GroupWeeklyLeaderboardResponse> {
  return apiFetch(`/groups/${id}/leaderboard/weekly?${pageQuery(options, { date: options.date })}`);
}

// --- Contact ---

export type ContactCategory = "bug" | "word-suggestion" | "account" | "groups" | "other";

/** Public — no auth needed, and none is sent (the contact page is reachable
 * whether or not you're signed in). Fire-and-forget once the 201 comes
 * back: no confirmation email, no echoed data. */
export function submitContactMessage(payload: {
  category: ContactCategory;
  name: string;
  email: string;
  message: string;
}): Promise<{ message: string }> {
  return apiFetch("/contact", { method: "POST", body: payload, skipAuth: true });
}
