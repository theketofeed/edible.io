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

  // Gemini /api/gemini — middle fallback (Claude → Gemini → Groq).
  // Live-verified against the worst-case 7-day/25-item prompt: gemini-2.5-flash
  // finished naturally in 33.5s at 7,713 output tokens. Backend 60s gives a
  // 26s+ cushion for free-tier slowness; frontend 75s = backend + 15s margin.
  GEMINI_BACKEND_MS: 60000,
  GEMINI_FRONTEND_MS: 75000,
}

// ─── Claude per-plan-size generation budget ─────────────────────────────────
// MAX_TOKENS is a cap, NOT a target: Anthropic bills per actual token emitted,
// so unused ceiling costs nothing and the model never "pads up" to it. A single
// high ceiling shared by every plan size is therefore the correct design —
// per-plan-size output needs vary wildly (measured live: a worst-case 3-day
// plan naturally ends at ~5,239 output tokens, a worst-case 5-day at ~8,533),
// and segmenting max_tokens is how this failure class was born (3500/3500 and
// 3072/3072 both truncated mid-JSON). One ceiling of 16384 sits far above the
// worst legitimate output of ANY size (incl. compact 6-7 day prompts), so a
// natural plan can never hit it. Runaway generations are instead bounded by
// each tier's attemptTimeoutMs: at the measured ~113 tok/s stream rate, even
// the longest per-attempt budget (130s) cuts a runaway at ~14.7k tokens —
// before it ever touches the 16384 ceiling.
export const CLAUDE_MAX_TOKENS = 16384

// The genuine per-size knob is the per-attempt TIMEOUT: a plan's natural
// completion wall-time scales with its size (measured: ~46s for 5.2k tokens on
// 3-day, ~75s for 8.5k on 5-day at ~113 tok/s). Each budget sits above its
// natural completion so real plans always finish, while still bounding how long
// a broken/runaway response may stream before the abort fires and Groq takes over.
export const CLAUDE_PLAN_SIZES = [
  // 1-3 days — natural completion up to ~46s; 70s leaves heavy headroom.
  { maxDays: 3, attemptTimeoutMs: 70000 },
  // 4-5 days — natural completion up to ~75s; 110s leaves heavy headroom.
  { maxDays: 5, attemptTimeoutMs: 110000 },
  // 6-7 days — compact prompt, historically ~36-40s on the previous model;
  // 130s generously covers the larger haiku-4-5 outputs without a retest.
  { maxDays: 7, attemptTimeoutMs: 130000 },
]

// Frontend timer = backend attempt budget + margin. The backend's one retry
// only fires on FAST transient errors (429/5xx) which never burn the full
// attempt budget, so this margin is ample — the browser can't abort something
// the server was about to deliver.
export const CLAUDE_FRONTEND_MARGIN_MS = 15000

// Returns the generation budget for a given effectiveDays. Unknown/missing
// days default to the largest (safest) budget. Both ends must call this.
// maxTokens is the SAME single ceiling for every size (see CLAUDE_MAX_TOKENS).
export function claudePlanConfig(days) {
  const effectiveDays = Number.isFinite(days) && days >= 1
    ? Math.min(7, Math.floor(days))
    : 7
  const size = CLAUDE_PLAN_SIZES.find(s => effectiveDays <= s.maxDays) ||
    CLAUDE_PLAN_SIZES[CLAUDE_PLAN_SIZES.length - 1]
  return {
    maxTokens: CLAUDE_MAX_TOKENS,
    attemptTimeoutMs: size.attemptTimeoutMs,
    frontendTimeoutMs: size.attemptTimeoutMs + CLAUDE_FRONTEND_MARGIN_MS,
  }
}

// ─── Groq output ceiling ────────────────────────────────────────────────────
// Unlike Claude, Groq's max_tokens is NOT free headroom on the on_demand tier:
// the 8K TPM rate limit for openai/gpt-oss-120b admits a request against
// "Requested" tokens (input + reserved output — errors report "Limit 8000,
// Requested N"). A Claude-style 16384 cap would therefore 413-reject EVERY
// meal-plan call (800 input + 16384 reserve ≈ 17K ≫ 8K).
//
// 6144 is the largest single ceiling that stays under that 8K admission check
// with the worst realistic meal-plan prompt (~800 input tokens):
//   800 + 6144 ≈ 7.0K < 8K  ✔
// while still leaving room to wait for the plan limiter / retries in the
// same minute window. It maps directly to the old *verified-safe* Claude 3-day
// ceiling, and the model natively supports up to 65,536 output tokens if the
// account ever moves to a higher TPM tier. GROQ_MAX_TOKENS env override wins.
export const GROQ_MAX_TOKENS = 6144

// ─── Gemini output ceiling ────────────────────────────────────────────────────
// Single generous cap for every plan size, same philosophy as CLAUDE_MAX_TOKENS:
// it is a ceiling, not a target, so it costs nothing until actually reached, and
// Gemini's free tier is INPUT-TPM based (no Groq-style input+reserve admission
// check). Live-verified worst case: 7-day/25-item plan finished at 7,713 output
// tokens — 20,000 leaves ~2.6× headroom. Env override wins (server reads it).
export const GEMINI_MODEL = 'gemini-2.5-flash'
export const GEMINI_MAX_OUTPUT_TOKENS = 20000