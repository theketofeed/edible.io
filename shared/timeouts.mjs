// ─── Single source of truth for all AI/timeout values ─────────────────────────
// Both the frontend (Vite/TS, via shared/timeouts.d.mts) and the backend
// (Node ESM, server.mjs + server/lib/*.js) import from here, so the scattered
// literals that previously lived in six files can never silently drift out of
// sync again.
//
// Invariant enforced throughout the flow:
//   FRONTEND TIMEOUT  >  ITS PAIRING BACKEND TIMEOUT
// The browser always receives the backend's terminal response (success or an
// explicit 504) instead of the browser aborting a request the server was about
// to finish delivering. This was the failure class behind "Edible is taking a
// breather": the 15s frontend Groq cap killed slow-but-valid 7-day responses
// that the backend (25s) would have completed.

export const TIMEOUTS = {
  // OCR.space — frontend 35s, backend aborts first at 30s
  OCR_FRONTEND_MS: 35000,
  OCR_BACKEND_MS: 30000,

  // Groq /api/groq — single backend ceiling (25s) shared by every consumer.
  // All frontend Groq consumers now use the same 30s (>25s) so a slow-but-
  // valid large-plan response is never cut off by the browser.
  GROQ_BACKEND_MS: 25000,
  GROQ_FRONTEND_MS: 30000,

  // Claude /api/claude — the frontend timer wraps ONLY the /api/claude fetch
  // (the Groq fallback has its own GROQ_FRONTEND_MS timer, it is not nested).
  // Timeouts are no longer a single fixed value: they scale with plan size via
  // claudePlanConfig() below, shared by the frontend timer and the backend's
  // per-attempt timeout + max_tokens. CLAUDE_ATTEMPT_TIMEOUT_MS env still wins
  // as a global override (see server.mjs).
  CLAUDE_FRONTEND_MS: 60000,

  // Meal images — frontend cap per image; each backend source has its own cap.
  MEAL_IMAGE_FRONTEND_MS: 30000,
  PEXELS_SEARCH_MS: 8000,
  PIXABAY_SEARCH_MS: 8000,
  PIXABAY_DOWNLOAD_MS: 15000,
  WIKIMEDIA_SEARCH_MS: 8000,
}

// ─── Claude per-plan-size generation budget (B-lite) ─────────────────────────
// One fixed maxTokens/attempt-timeout for every plan size was provably wrong
// both ways: too tight for 6-7 day plans (measured 35.5s against an old 37s
// cap) and wasteful for 1-3 day plans. The frontend and backend both derive
// their values from claudePlanConfig(days), so they can never disagree about
// how long a plan is allowed to run or how much output it may produce.
export const CLAUDE_PLAN_SIZES = [
  // Verified against a realistic 2-day, detailed meal-plan prompt: 2048 and 2500
  // tokens truncated mid-JSON; 3000+ completed cleanly. We keep the 1-3 day
  // tier at 3500 for margin and to avoid edge cases from unusually detailed
  // grocery lists or longer instructional output. The 4-5 day tier is ~30s for
  // 3072 tokens, which scales to ~34.2s for 3500 tokens; we round up to 40s to
  // leave headroom without breaching the shared frontend margin pattern.
  { maxDays: 3, maxTokens: 3500, attemptTimeoutMs: 40000 },
  { maxDays: 5, maxTokens: 3072, attemptTimeoutMs: 30000 },
  { maxDays: 7, maxTokens: 8192, attemptTimeoutMs: 75000 },
]

// Frontend timer = backend attempt budget + margin. The backend's one retry
// only fires on FAST transient errors (429/5xx) which never burn the full
// attempt budget, so this margin is ample — the browser can't abort something
// the server was about to deliver.
export const CLAUDE_FRONTEND_MARGIN_MS = 15000

// Returns the generation budget for a given effectiveDays. Unknown/missing
// days default to the largest (safest) budget. Both ends must call this.
export function claudePlanConfig(days) {
  const effectiveDays = Number.isFinite(days) && days >= 1
    ? Math.min(7, Math.floor(days))
    : 7
  const size = CLAUDE_PLAN_SIZES.find(s => effectiveDays <= s.maxDays) ||
    CLAUDE_PLAN_SIZES[CLAUDE_PLAN_SIZES.length - 1]
  return {
    maxTokens: size.maxTokens,
    attemptTimeoutMs: size.attemptTimeoutMs,
    frontendTimeoutMs: size.attemptTimeoutMs + CLAUDE_FRONTEND_MARGIN_MS,
  }
}