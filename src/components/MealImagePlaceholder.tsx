/**
 * MealImagePlaceholder
 * Animated SVG food illustrations shown while the real meal image is loading.
 * Each meal type gets its own themed character — no emojis, no grey boxes.
 */

interface Props {
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | string
  className?: string
}

// ─── Breakfast: steaming coffee cup + toast ───────────────────────────────────
function BreakfastSVG() {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="bf-bg" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF3C7" />
          <stop offset="1" stopColor="#FDE68A" />
        </linearGradient>
        <style>{`
          @keyframes bf-steam1 {
            0%,100% { transform: translateY(0) scaleX(1); opacity: 0.7; }
            50%      { transform: translateY(-3px) scaleX(1.2); opacity: 0.3; }
          }
          @keyframes bf-steam2 {
            0%,100% { transform: translateY(0) scaleX(1); opacity: 0.5; }
            50%      { transform: translateY(-4px) scaleX(0.8); opacity: 0.2; }
          }
          @keyframes bf-bob {
            0%,100% { transform: translateY(0); }
            50%      { transform: translateY(-1px); }
          }
          .bf-steam1 { animation: bf-steam1 1.6s ease-in-out infinite; transform-origin: center bottom; }
          .bf-steam2 { animation: bf-steam2 1.6s ease-in-out infinite 0.4s; transform-origin: center bottom; }
          .bf-bob    { animation: bf-bob 2s ease-in-out infinite; }
        `}</style>
      </defs>

      {/* Background */}
      <rect width="56" height="56" rx="12" fill="url(#bf-bg)" />

      {/* Toast (back-left) */}
      <g className="bf-bob" style={{ animationDelay: '0.3s' }}>
        <rect x="8" y="22" width="18" height="22" rx="3" fill="#D97706" />
        <rect x="9" y="23" width="16" height="10" rx="2" fill="#F59E0B" />
        {/* toast crust */}
        <rect x="8" y="38" width="18" height="6" rx="2" fill="#B45309" />
        {/* butter swipe */}
        <rect x="11" y="26" width="10" height="2" rx="1" fill="#FDE68A" opacity="0.8" />
      </g>

      {/* Coffee cup */}
      <g className="bf-bob">
        {/* Steam wisps */}
        <path className="bf-steam1" d="M31 16 Q32 13 31 10" stroke="#A16207" strokeWidth="1.2" strokeLinecap="round" />
        <path className="bf-steam2" d="M35 17 Q36 14 35 11" stroke="#A16207" strokeWidth="1.2" strokeLinecap="round" />

        {/* Cup body */}
        <path d="M27 20 L27 36 Q27 38 29 38 L41 38 Q43 38 43 36 L43 20 Z" fill="#78350F" />
        {/* Cup shine */}
        <rect x="28" y="21" width="4" height="10" rx="2" fill="#A16207" opacity="0.4" />
        {/* Coffee surface */}
        <ellipse cx="35" cy="20" rx="8" ry="2" fill="#92400E" />
        <ellipse cx="35" cy="20" rx="5" ry="1" fill="#A16207" opacity="0.5" />

        {/* Handle */}
        <path d="M43 24 Q49 24 49 29 Q49 34 43 34" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Saucer */}
        <ellipse cx="35" cy="39" rx="10" ry="2.5" fill="#D97706" />
        <ellipse cx="35" cy="39" rx="7" ry="1.5" fill="#F59E0B" opacity="0.5" />
      </g>
    </svg>
  )
}

// ─── Lunch: stacked sandwich ──────────────────────────────────────────────────
function LunchSVG() {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="lu-bg" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D1FAE5" />
          <stop offset="1" stopColor="#A7F3D0" />
        </linearGradient>
        <style>{`
          @keyframes lu-bounce {
            0%,100% { transform: translateY(0); }
            40%      { transform: translateY(-2px); }
            60%      { transform: translateY(-1px); }
          }
          @keyframes lu-wiggle {
            0%,100% { transform: rotate(0deg); }
            25%      { transform: rotate(1deg); }
            75%      { transform: rotate(-1deg); }
          }
          .lu-bob    { animation: lu-bounce 2.2s ease-in-out infinite; }
          .lu-wiggle { animation: lu-wiggle 3s ease-in-out infinite; transform-origin: 28px 36px; }
        `}</style>
      </defs>

      {/* Background */}
      <rect width="56" height="56" rx="12" fill="url(#lu-bg)" />

      <g className="lu-wiggle">
        {/* Bottom bread slice */}
        <rect x="8" y="38" width="40" height="8" rx="4" fill="#D97706" />
        <rect x="9" y="39" width="38" height="5" rx="3" fill="#F59E0B" />

        {/* Lettuce frills */}
        <path d="M8 37 Q12 33 16 37 Q20 33 24 37 Q28 33 32 37 Q36 33 40 37 Q44 33 48 37" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Tomato slices */}
        <ellipse cx="20" cy="34" rx="7" ry="3" fill="#EF4444" />
        <ellipse cx="36" cy="34" rx="7" ry="3" fill="#EF4444" />
        {/* Tomato seed lines */}
        <line x1="20" y1="32" x2="20" y2="36" stroke="#FCA5A5" strokeWidth="0.8" />
        <line x1="17" y1="33" x2="23" y2="35" stroke="#FCA5A5" strokeWidth="0.8" />

        {/* Cheese */}
        <path d="M9 32 L47 32 L44 28 L12 28 Z" fill="#FCD34D" />
        <path d="M12 28 L14 25 L16 28" fill="#FDE68A" />
        <path d="M38 28 L40 25 L42 28" fill="#FDE68A" />

        {/* Meat patty */}
        <rect x="10" y="24" width="36" height="5" rx="2.5" fill="#9A3412" />
        <rect x="11" y="25" width="34" height="2" rx="1" fill="#B45309" opacity="0.4" />

        {/* Top bread */}
        <g className="lu-bob">
          <ellipse cx="28" cy="21" rx="20" ry="5" fill="#D97706" />
          <ellipse cx="28" cy="19" rx="18" ry="4" fill="#F59E0B" />
          {/* Sesame seeds */}
          <ellipse cx="22" cy="17" rx="2" ry="1" fill="#FDE68A" transform="rotate(-20 22 17)" />
          <ellipse cx="28" cy="16" rx="2" ry="1" fill="#FDE68A" transform="rotate(10 28 16)" />
          <ellipse cx="34" cy="17" rx="2" ry="1" fill="#FDE68A" transform="rotate(-10 34 17)" />
        </g>
      </g>
    </svg>
  )
}

// ─── Dinner: plate with fork & knife ─────────────────────────────────────────
function DinnerSVG() {
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="di-bg" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EDE9FE" />
          <stop offset="1" stopColor="#DDD6FE" />
        </linearGradient>
        <linearGradient id="di-plate" x1="12" y1="12" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5F3FF" />
          <stop offset="1" stopColor="#EDE9FE" />
        </linearGradient>
        <style>{`
          @keyframes di-steam {
            0%,100% { transform: translateY(0) scaleX(1); opacity: 0.6; }
            50%      { transform: translateY(-4px) scaleX(1.3); opacity: 0.2; }
          }
          @keyframes di-pulse {
            0%,100% { transform: scale(1); }
            50%      { transform: scale(1.02); }
          }
          @keyframes di-cutlery {
            0%,100% { transform: rotate(0deg); }
            50%      { transform: rotate(2deg); }
          }
          .di-steam1 { animation: di-steam 1.8s ease-in-out infinite; transform-origin: center bottom; }
          .di-steam2 { animation: di-steam 1.8s ease-in-out infinite 0.5s; transform-origin: center bottom; }
          .di-pulse  { animation: di-pulse 2.5s ease-in-out infinite; transform-origin: 28px 30px; }
          .di-cut    { animation: di-cutlery 3s ease-in-out infinite; transform-origin: 28px 28px; }
        `}</style>
      </defs>

      {/* Background */}
      <rect width="56" height="56" rx="12" fill="url(#di-bg)" />

      {/* Fork (left) */}
      <g className="di-cut" style={{ animationDelay: '0.2s' }}>
        <rect x="10" y="10" width="2.5" height="22" rx="1.25" fill="#7C3AED" />
        {/* Tines */}
        <rect x="9" y="10" width="1.5" height="8" rx="0.75" fill="#7C3AED" />
        <rect x="11.5" y="10" width="1.5" height="8" rx="0.75" fill="#7C3AED" />
        <rect x="13.5" y="10" width="1.5" height="8" rx="0.75" fill="#7C3AED" />
        {/* Handle */}
        <rect x="10" y="32" width="2.5" height="14" rx="1.25" fill="#7C3AED" />
      </g>

      {/* Knife (right) */}
      <g className="di-cut">
        <rect x="43.5" y="10" width="2.5" height="36" rx="1.25" fill="#6D28D9" />
        {/* Blade edge */}
        <path d="M43.5 10 Q42 10 42 14 L43.5 18 Z" fill="#8B5CF6" />
      </g>

      {/* Plate */}
      <g className="di-pulse">
        {/* Plate shadow */}
        <ellipse cx="28" cy="32" rx="17" ry="3" fill="#7C3AED" opacity="0.08" />
        {/* Plate rim */}
        <circle cx="28" cy="29" r="17" fill="white" />
        <circle cx="28" cy="29" r="16" stroke="#E5E7EB" strokeWidth="0.5" fill="url(#di-plate)" />
        {/* Inner ring */}
        <circle cx="28" cy="29" r="12" stroke="#DDD6FE" strokeWidth="1" fill="none" />

        {/* Food: steak/protein */}
        <ellipse cx="28" cy="30" rx="8" ry="5" fill="#92400E" />
        <ellipse cx="27" cy="29" rx="6" ry="3.5" fill="#B45309" />
        {/* Grill marks */}
        <path d="M23 28 Q25 26 27 28" stroke="#78350F" strokeWidth="1" strokeLinecap="round" />
        <path d="M25 30 Q27 28 29 30" stroke="#78350F" strokeWidth="1" strokeLinecap="round" />

        {/* Garnish - green herb */}
        <circle cx="34" cy="25" r="3" fill="#16A34A" />
        <circle cx="35" cy="24" r="2" fill="#22C55E" />

        {/* Sauce drizzle */}
        <path d="M21 32 Q24 35 28 33 Q32 31 35 34" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
      </g>

      {/* Steam wisps above plate */}
      <path className="di-steam1" d="M25 15 Q26 11 25 8" stroke="#7C3AED" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <path className="di-steam2" d="M29 14 Q30 10 29 7" stroke="#7C3AED" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────
export default function MealImagePlaceholder({ mealType, className = '' }: Props) {
  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`}>
      {mealType === 'Breakfast' && <BreakfastSVG />}
      {mealType === 'Lunch'     && <LunchSVG />}
      {mealType === 'Dinner'    && <DinnerSVG />}
      {!['Breakfast', 'Lunch', 'Dinner'].includes(mealType) && <DinnerSVG />}
    </div>
  )
}
