// Every backend endpoint, grouped by feature. Import from "@/lib/api" as
// before — this barrel re-exports each module:
//
//   client          shared HTTP client, token/deviceId storage, session refresh
//   auth            email/password, Google, logout, password reset
//   passkeys        WebAuthn enrollment and recovery login
//   daily-game      Daily mode (UTC day, stats/streaks)
//   infinite-game   Infinite mode rounds and the hint endpoint
//   infinite-tiers  Infinite tier leaderboard: tiers, status, board
//   groups          create/join/leave, my groups
//   leaderboards    Daily-mode global and group leaderboards
//   notifications   tier, coin and decay notifications
//   wallet          coin balance and ledger
//   store           coin packs and Razorpay orders
//   contact         public contact form
//
// Cron, webhook and admin endpoints in the backend contract are
// server-to-server only and deliberately have no client here.

export {
  ApiRequestError,
  clearDeviceId,
  clearToken,
  getDeviceId,
  getStoredDeviceId,
  getToken,
  refreshSession,
  setDeviceId,
  setToken,
} from "./client";
export * from "./auth";
export * from "./passkeys";
export * from "./daily-game";
export * from "./infinite-game";
export * from "./infinite-tiers";
export * from "./groups";
export * from "./leaderboards";
export * from "./notifications";
export * from "./wallet";
export * from "./store";
export * from "./contact";
export * from "./sync";
