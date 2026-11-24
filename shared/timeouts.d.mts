export declare const TIMEOUTS: {
  readonly OCR_FRONTEND_MS: number
  readonly OCR_BACKEND_MS: number
  readonly GROQ_BACKEND_MS: number
  readonly GROQ_FRONTEND_MS: number
  readonly CLAUDE_FRONTEND_MS: number
  readonly MEAL_IMAGE_FRONTEND_MS: number
  readonly PEXELS_SEARCH_MS: number
  readonly PIXABAY_SEARCH_MS: number
  readonly PIXABAY_DOWNLOAD_MS: number
  readonly WIKIMEDIA_SEARCH_MS: number
  readonly GEMINI_BACKEND_MS: number
  readonly GEMINI_FRONTEND_MS: number
}

export declare const CLAUDE_MAX_TOKENS: number

export declare const GROQ_MAX_TOKENS: number

export declare const GEMINI_MODEL: string
export declare const GEMINI_MAX_OUTPUT_TOKENS: number

export declare const CLAUDE_PLAN_SIZES: ReadonlyArray<{
  readonly maxDays: number
  readonly attemptTimeoutMs: number
}>

export declare const CLAUDE_FRONTEND_MARGIN_MS: number

export declare function claudePlanConfig(days?: number): {
  maxTokens: number
  attemptTimeoutMs: number
  frontendTimeoutMs: number
}

export declare const PIPELINE_STEP1_MS: number

export declare const PIPELINE_STEP2_MS: number

export declare const PIPELINE_STEP3_MS: number

export declare const PIPELINE_STEP3_SPLIT_MS: number

export declare const PIPELINE_TOTAL_MS: number

export declare const PIPELINE_FRONTEND_MS: number