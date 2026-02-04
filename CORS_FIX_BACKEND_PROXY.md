# CORS Fix: Backend Proxy for Claude API

## Problem
When running Edible.io in the browser (frontend), calling Claude API directly resulted in CORS errors:
```
Access to fetch at 'https://api.anthropic.com/v1/messages' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

This is a security feature of browsers that prevents frontend code from calling external APIs directly.

## Solution
Created a **backend proxy server** that:
1. Accepts requests from the React frontend (same-origin, no CORS issues)
2. Forwards requests to Claude API from the server (no CORS restrictions)
3. Returns results back to the frontend

### Architecture
```
Frontend (React)                Backend (Node.js)              Claude API
    |                               |                             |
    +---(POST /api/claude)-------->|                             |
    |                               +----(x-api-key auth)------->|
    |                               |                             |
    |<--(Claude Response)-----------|<----(JSON response)---------|
    |
```

## Implementation

### Files Created
- **`server.mjs`** - Backend API server with Claude proxy endpoint

### Files Modified
- **`package.json`** - Added `backend` and `dev:all` scripts
- **`src/lib/mealPlanGenerator.ts`** - Updated `callClaude()` to call backend proxy instead of Claude directly

### New NPM Scripts
```bash
npm run backend      # Start backend server on port 3001
npm run dev:all      # Run backend + frontend together (recommended)
npm run dev          # Frontend only (requires separate `npm run backend`)
```

## Setup Instructions

### 1. Start Backend Server
```bash
npm run backend
```
You should see:
```
✅ Backend server running on http://localhost:3001
📍 Claude proxy endpoint: http://localhost:3001/api/claude
```

### 2. In Another Terminal, Start Frontend
```bash
npm run dev
```

### 3. Or Run Both Simultaneously (Recommended)
```bash
npm run dev:all
```

## How It Works

### Before (CORS Error ❌)
```
React App → Claude API (Blocked by browser CORS policy)
```

### After (Working ✅)
```
React App → Backend Server (same-origin, allowed)
Backend Server → Claude API (server-to-server, no CORS issues)
```

### Backend Proxy Endpoint
- **URL**: `http://localhost:3001/api/claude`
- **Method**: POST
- **Request Body**: `{ "prompt": "..." }`
- **Response**: Claude API JSON response
- **API Key**: Loaded from `VITE_CLAUDE_API_KEY` in `.env.local` (kept secure on server)

## Security Benefits

1. **API Key Protection**: Claude API key never exposed to frontend/browser
2. **No CORS Bypass**: Uses standard backend proxy pattern
3. **Server-to-Server**: Direct Claude calls from backend (no browser restrictions)
4. **Environment Variables**: Keys loaded securely from `.env.local` on server only

## Fallback Chain (Now Working)

With the backend proxy in place:
1. **Claude** (Primary) - Now works! Backend handles CORS and authentication
2. **Groq** (Fallback) - Still works (already CORS-compatible)
3. **Manual** (Last Resort) - Sample meal plan

## Testing

### Test Backend Health
```bash
curl http://localhost:3001/health
```

### Test Claude Endpoint
```bash
curl -X POST http://localhost:3001/api/claude \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Generate a simple JSON response with {\"test\": true}"}'
```

## Troubleshooting

### Backend won't start
- Ensure port 3001 is not in use
- Check Node.js is installed: `node --version`
- Check dependencies: `npm install`

### Claude still shows errors
- Verify `.env.local` has `VITE_CLAUDE_API_KEY=sk-ant-...`
- Check backend console for `[Claude Backend]` messages
- Ensure backend is running before making requests from frontend

### "Cannot find module" errors
- Run `npm install express cors` again
- Check that `server.mjs` exists in root directory

## Cost Efficiency

Claude Haiku remains super cheap:
- **Cost**: $0.25/1M tokens (~$0.0005 per meal plan)
- **Backend Overhead**: Minimal (just forwarding requests)
- **Comparison**: Groq is free but Claude quality often better for structured tasks

## Next Steps

- All meal plan requests will now try Claude first (through proxy)
- If Claude backend is unavailable, Groq automatically handles requests
- Test by uploading a receipt and generating a meal plan

---

**Status**: ✅ Backend proxy fully implemented and running
