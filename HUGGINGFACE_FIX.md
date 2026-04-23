# 🎨 HuggingFace Image Generation Fix - Setup Guide

## The Problem
Your app was falling back to generic Unsplash placeholder images instead of generating beautiful, food-specific images. This happened because:
- Direct frontend calls to HuggingFace failed with DNS/CORS issues
- No backend proxy to handle retries when the model was loading
- Missing or invalid API key configuration

## The Solution
All code has been updated to use a **backend proxy** for HuggingFace, which:
✅ Handles model cold-starts (automatic 20s retry)
✅ Avoids CORS issues
✅ Keeps API key secure on backend
✅ Provides better error handling & logging

## What Changed

### Backend (`server.mjs`)
- ✅ Added `/api/generate-meal-image` endpoint
- ✅ Handles HuggingFace FLUX.1-schnell requests with retry logic
- ✅ Streams image blob back to frontend

### Frontend (`src/lib/mealImages.ts`)
- ✅ Updated to call backend proxy instead of direct HuggingFace calls
- ✅ Better error logging for debugging
- ✅ Faster fallback to Unsplash while AI generates in background

### Config Files
- ✅ Updated `.env.example` with `VITE_HF_API_KEY` and `VITE_BACKEND_URL`
- ✅ Created `.env.local.template` with detailed setup instructions

## Setup Instructions (3 Steps)

### Step 1: Get HuggingFace API Key
1. Go to https://huggingface.co/settings/tokens
2. Click "New token"
3. Name: `edible-io-flux`
4. Type: `Read` (fine-grained access fine too)
5. Copy the token starting with `hf_`

### Step 2: Update `.env.local`
Copy this into your `.env.local` file:

```env
# HuggingFace Image Generation (NEW)
VITE_HF_API_KEY=hf_your_token_here_xxxxxxxxxxxxx

# Backend URL
VITE_BACKEND_URL=http://localhost:3001

# ... rest of your config (Claude, Groq, Supabase, etc.)
```

### Step 3: Restart Your Dev Server
```bash
npm run dev
```

That's it! Now when you upload a receipt:
1. **Instantly** → See category-matched fallback image (chicken → nice chicken photo)
2. **2-5 seconds** → AI generates beautiful FLUX image, replaces fallback automatically
3. **If HF fails** → Stays on fallback (no broken images)

## How to Verify It's Working

Open browser DevTools (F12) → Console, and look for:
```
[MealImages] Using fallback for: "Grilled Chicken Breast"
[MealImages] Requesting HF generation for: "Grilled Chicken Breast"
...waiting 2-5 seconds...
[MealImages] ✅ HF generated image (2847292 bytes) for: "Grilled Chicken Breast"
[MealImages] ✅ Upgraded cache with AI image for: "Grilled Chicken Breast"
```

If you see:
- `[MealImages] HF backend error: 400` → Missing or invalid VITE_HF_API_KEY
- `[MealImages] AI generation unavailable` → Backend can't reach HuggingFace API
- `[MealImages] Using fallback...` only → HF generation in progress (wait a moment)

## API Limits
- **Free tier**: 1,000 requests/day
- **Generation time**: 2-5 seconds per image
- **Cost**: Free! (upgrade to pro if needed)

## Troubleshooting

### Still seeing only Unsplash images?
```bash
# 1. Check .env.local exists and has VITE_HF_API_KEY
ls -la .env.local

# 2. Check the key starts with 'hf_'
cat .env.local | grep VITE_HF_API_KEY

# 3. Check backend is running on port 3001
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"2026-04-23T..."}

# 4. Try generating an image manually (DevTools console)
fetch('http://localhost:3001/api/generate-meal-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mealTitle: 'Grilled Salmon' })
}).then(r => r.blob()).then(b => console.log('Image bytes:', b.size))
```

### Getting 401 or 403 errors?
- Your HuggingFace token might be invalid or expired
- Go back to https://huggingface.co/settings/tokens and regenerate it

### API requests timing out?
- Check your internet connection
- HuggingFace might be experiencing issues (check their status page)
- Try again in a few seconds

## Production Deployment

When deploying to production:
1. Generate a new HuggingFace token for production (don't reuse dev token)
2. Set `VITE_HF_API_KEY` in your production `.env.local`
3. Set `VITE_BACKEND_URL` to your production backend URL
4. Redeploy backend and frontend

## Files Modified
- `server.mjs` — Added `/api/generate-meal-image` endpoint
- `src/lib/mealImages.ts` — Updated to use backend proxy
- `.env.example` — Added VITE_HF_API_KEY and VITE_BACKEND_URL
- `.env.local.template` — Created setup guide (copy to .env.local)

## Next Steps
1. Follow the 3-step setup above
2. Restart your dev server
3. Upload a receipt and watch the magic happen! ✨
4. Check the console logs to verify HuggingFace is generating images

Questions? Check the code comments in:
- `server.mjs` (lines ~290-370)
- `src/lib/mealImages.ts` (lines ~75-160)
