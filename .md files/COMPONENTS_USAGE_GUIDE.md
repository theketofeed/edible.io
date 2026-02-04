# Landing Page Components - Usage Guide

## Quick Reference

### 1. HowItWorks Component
**File**: `src/components/HowItWorks.tsx`

```tsx
import HowItWorks from './components/HowItWorks'

export default function App() {
	return <HowItWorks />
}
```

**Features**:
- No props required (fully self-contained)
- Displays 3-step process with icons
- Responsive grid (1 column mobile, 3 columns desktop)
- Light purple gradient background
- Memoized for performance

---

### 2. Features Component
**File**: `src/components/Features.tsx`

```tsx
import Features from './components/Features'

export default function App() {
	return <Features />
}
```

**Features**:
- 6 benefit cards with checkmarks
- Hover effects with border & shadow transitions
- Responsive grid (1 column mobile, 2-3 columns desktop)
- White background with border cards

---

### 3. Testimonials Component
**File**: `src/components/Testimonials.tsx`

```tsx
import Testimonials from './components/Testimonials'

export default function App() {
	return <Testimonials />
}
```

**Features**:
- 3 testimonial cards with quotes
- 5-star ratings (all 5 stars)
- Variable content length with min-height for alignment
- Light gray background
- Quote italics for emphasis

---

### 4. FinalCTA Component
**File**: `src/components/FinalCTA.tsx`

```tsx
import FinalCTA from './components/FinalCTA'

export default function App() {
	return (
		<FinalCTA 
			onCTAClick={() => {
				// Handle CTA click (e.g., scroll to form)
				console.log('CTA clicked!')
			}}
		/>
	)
}
```

**Props**:
- `onCTAClick?: () => void` - Callback when button is clicked

**Features**:
- Automatic scroll-to-upload functionality
- Purple gradient background
- White button with hover lift effect
- Trust badge with checkmark
- Optional custom click handler

---

### 5. FAQ Component
**File**: `src/components/FAQ.tsx`

```tsx
import FAQ from './components/FAQ'

export default function App() {
	return <FAQ />
}
```

**Features**:
- 6 pre-loaded FAQ items
- Accordion expand/collapse functionality
- First item open by default
- Smooth transitions with rotate animation
- Purple hover states on questions

**Customization**: Edit `FAQ_ITEMS` array in component to modify questions

---

### 6. Footer Component
**File**: `src/components/Footer.tsx`

```tsx
import Footer from './components/Footer'

export default function App() {
	return <Footer />
}
```

**Features**:
- 3-column footer layout
- Product, Company, Legal columns
- Social media icons (Twitter, Instagram, Facebook)
- Dynamic copyright year
- Link navigation with purple hover effects
- Dark background (gray-900)

**Customization**: Edit `FOOTER_COLUMNS` and `SOCIAL_LINKS` arrays to modify content

---

### 7. Updated DietSelector Component
**File**: `src/components/DietSelector.tsx`

```tsx
import DietSelector from './components/DietSelector'

export default function App() {
	const [diet, setDiet] = useState('Balanced')

	return (
		<DietSelector 
			value={diet}
			onChange={setDiet}
			disabled={false}
		/>
	)
}
```

**Props**:
- `value: DietType` - Currently selected diet
- `onChange: (diet: DietType) => void` - Callback on diet change
- `disabled?: boolean` - Disable all buttons

**Features**:
- 8 diet options with emoji icons
- Grouped by popularity (3 popular, 5 others)
- "Most Popular" badge
- Icons and descriptions for each diet
- 2-row layout with responsive columns
- Hover lift effect with shadow
- Purple selected state

---

## Integration in App.tsx

The main App component conditionally renders:

1. **Landing Page** (when `!result`) - Shows:
   - Hero Section
   - Upload Area
   - Diet Selector
   - Meal Plan Options
   - How It Works
   - Features
   - Testimonials
   - Final CTA
   - FAQ

2. **Results View** (when `result`) - Shows:
   - Meal Plan Results
   - "Create Another Meal Plan" button

3. **Footer** - Always visible at bottom

---

## Styling Guidelines

### Colors
```css
/* Primary */
background: #A855F7;  /* purple-600 */
background: #9333EA;  /* purple-700 (darker) */

/* Backgrounds */
background: #F3E8FF;  /* Light purple (backgrounds) */
background: #F9FAFB;  /* Light gray (gray-50) */
background: #FFFFFF;  /* White */
background: #111827;  /* Dark gray (gray-900) */

/* Text */
color: #111827;       /* gray-900 (primary) */
color: #4B5563;       /* gray-600 (secondary) */
color: #9CA3AF;       /* gray-400 (tertiary) */
```

### Responsive Breakpoints
```css
/* Mobile First */
@media (md: 768px) { /* md: */
	/* Tablet and up */
}

@media (lg: 1024px) { /* lg: */
	/* Desktop and up */
}
```

### Spacing
```css
/* Vertical spacing between sections */
padding-top: 80px;     /* py-20 */
padding-bottom: 80px;

padding-top: 96px;     /* py-24 */
padding-bottom: 96px;

/* Horizontal */
padding: 16px;         /* p-4 (mobile) */
padding: 24px;         /* p-6 (tablet) */
padding: 32px;         /* p-8 (desktop) */
```

---

## Performance Optimizations

All landing page components use:
- `React.memo()` for memoization
- `useCallback()` for event handlers
- No unnecessary re-renders
- Self-contained state (no prop drilling)

---

## Accessibility Features

✓ Semantic HTML (`<button>`, `<section>`, `<h2>`)
✓ Proper heading hierarchy
✓ ARIA labels on interactive elements
✓ Sufficient color contrast ratios
✓ Keyboard navigation support
✓ Focus visible states

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Android)

All components use standard CSS and Tailwind utilities with no experimental features.

---

## Customization Examples

### Add a new feature to Features component:
1. Open `src/components/Features.tsx`
2. Add to `FEATURES` array:
```tsx
{
	icon: '🎯',
	title: 'New Feature',
	description: 'Feature description here'
}
```

### Change footer links:
1. Open `src/components/Footer.tsx`
2. Modify `FOOTER_COLUMNS` array

### Update testimonials:
1. Open `src/components/Testimonials.tsx`
2. Update `TESTIMONIALS` array

### Modify FAQ questions:
1. Open `src/components/FAQ.tsx`
2. Edit `FAQ_ITEMS` array

### Add new diet:
1. Open `src/utils/types.ts`
2. Add to `DietType` union
3. Update `DIET_INFO` and diet arrays in `DietSelector.tsx`
