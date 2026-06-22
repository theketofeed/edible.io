import posthog from 'posthog-js'

export const Events = {
  // Input & Generation
  INPUT_METHOD_SELECTED: 'input_method_selected',
  GROCERY_INPUT_STARTED: 'grocery_input_started',
  GENERATE_PLAN_CLICKED: 'generate_plan_clicked',
  PLAN_GENERATED_SUCCESS: 'plan_generated_success',
  PLAN_GENERATED_FAILED: 'plan_generated_failed',
  PLAN_SAVED: 'plan_saved',
  PLAN_SWITCHED: 'plan_switched',
  PLAN_DELETED: 'plan_deleted',

  // Auth & Conversion
  AUTH_MODAL_OPENED: 'auth_modal_opened',
  SIGNUP_COMPLETED: 'signup_completed',
  PRICING_MODAL_OPENED: 'pricing_modal_opened',
  CHECKOUT_STARTED: 'checkout_started',
  UPGRADE_CLICKED: 'upgrade_clicked',

  // Dashboard engagement
  RECIPE_VIEWED: 'recipe_viewed',
  PDF_DOWNLOADED: 'pdf_downloaded',
  PLAN_VIEWED: 'plan_viewed',

  // Homepage engagement
  HERO_CTA_CLICKED: 'hero_cta_clicked',
  HOW_IT_WORKS_VIEWED: 'how_it_works_viewed',
} as const

type EventName = typeof Events[keyof typeof Events]

export function track(event: EventName, properties?: Record<string, string | number | boolean>) {
  posthog.capture(event, properties)
}
