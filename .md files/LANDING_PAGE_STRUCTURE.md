# Edible.io Landing Page - Complete Structure

## Page Flow (Desktop View)

```
┌─────────────────────────────────────────┐
│          HEADER (Navigation)             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│    HERO SECTION (Main CTA)               │
│  "Turn grocery receipts into meal plans" │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  UPLOAD & MEAL PLAN EDITOR               │
│  - Upload Receipt Area                   │
│  - Diet Selector (with icons & labels)   │
│  - Meal Plan Duration Selector           │
│  - Generate Button                       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   HOW IT WORKS (3-Step Process)          │
│  1. Upload Receipt 📸                    │
│  2. Choose Your Diet 🥗                  │
│  3. Get Your Plan ✨                     │
│   [Light Purple Gradient Background]     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   FEATURES/BENEFITS (6 Cards)            │
│  ✓ No Food Waste                         │
│  ✓ Save Time & Money                     │
│  ✓ Dietary Freedom                       │
│  ✓ Realistic Recipes                     │
│  ✓ Smart Portions                        │
│  ✓ Easy to Follow                        │
│   [White Background]                     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   TESTIMONIALS (3 Cards with 5-Stars)    │
│  "Edible saves me hours every week"      │
│  - Sarah Mitchell, Busy Parent           │
│   [Light Gray Background]                │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   FINAL CTA SECTION                      │
│  "Start Planning Your Meals Today"       │
│  [Try Edible Free] [Prominent Button]    │
│  ✓ Trusted by 10,000+ home cooks         │
│   [Purple Gradient Background]           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   FAQ SECTION (6 Expandable Items)       │
│  Q: What stores do you support?          │
│  Q: Can I edit the meal plan?            │
│  Q: How many diets?                      │
│  Q: Is this really free?                 │
│  Q: What if I don't like a recipe?       │
│  Q: How accurate is the OCR?             │
│   [White Background]                     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   FOOTER (3 Columns + Social)            │
│  Product  |  Company  |  Legal           │
│  Features | About     | Privacy          │
│  How it   | Blog      | Terms            │
│  Pricing  | Careers   | Cookies          │
│  Download | Contact   | Disclaimer       │
│  [Dark Gray Background - gray-900]       │
│  [Social Media Icons Bottom Right]       │
└─────────────────────────────────────────┘
```

## Alternative View: After Meal Plan Generated

```
┌─────────────────────────────────────────┐
│          HEADER (Navigation)             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   MEAL PLAN RESULTS                      │
│  - Day-by-day recipes                    │
│  - Nutritional info                      │
│  - Print/Download/Copy buttons           │
│  - Regenerate button                     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  [Create Another Meal Plan Button]       │
│  (Returns to editor view)                │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   FOOTER (3 Columns + Social)            │
└─────────────────────────────────────────┘
```

## Component Statistics

| Component | Lines | Features |
|-----------|-------|----------|
| HowItWorks | ~90 | 3 steps, icons, badges, connectors |
| Features | ~85 | 6 feature cards, checkmark badges |
| Testimonials | ~75 | 3 testimonials, star ratings |
| FinalCTA | ~65 | Gradient bg, scroll-to-action |
| FAQ | ~110 | 6 items, accordion, expand/collapse |
| Footer | ~105 | 3 columns, social links, copyright |
| DietSelector (updated) | ~125 | Icons, descriptions, 2-row layout |
| App.tsx (updated) | +60 | All imports, conditional rendering |

## Key Design Features

✨ **Visual Hierarchy**
- Large headings (30px-36px on desktop, 24px mobile)
- Secondary text (16px-20px)
- Micro-copy (12px-14px)

🎨 **Color Palette**
- Primary Purple: #A855F7 (purple-600), #9333EA (purple-700)
- Secondary: Light purple (#F3E8FF) for backgrounds
- Neutral: Gray (gray-900, gray-600, gray-400)
- Accent: Purple badges and hover states

📱 **Responsive Breakpoints**
- Mobile: Single column, 16px padding, stacked layouts
- Tablet (768px+): 2-3 columns, increased spacing
- Desktop (1024px+): Full layouts with connectors

⚡ **Interactive Elements**
- Hover effects with shadow and lift (translateY)
- Smooth transitions (200-300ms)
- Accordion expand/collapse in FAQ
- Scroll-to-action buttons
- Disabled states with tooltips

## Conversion Flow

1. **Awareness** → Hero Section introduces the value prop
2. **Interest** → How It Works shows simplicity
3. **Consideration** → Features highlight benefits
4. **Social Proof** → Testimonials build trust
5. **Action** → Final CTA drives signup
6. **Confidence** → FAQ answers objections
7. **Support** → Footer provides navigation & legal

Each section builds on the previous to guide users toward action.
