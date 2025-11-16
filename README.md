# edible.io
AI meal planner app

## Environment variables / OpenAI key

Short guidance to avoid confusion when moving your OpenAI key into an env file:

- Vite (client-side) only exposes env variables prefixed with `VITE_` to the browser via `import.meta.env`. If you put your key in `.env.local` as `OPENAI_API_KEY` the Vite dev server will NOT expose it to client code.
- Do NOT expose a secret API key in client-side code. If your app calls OpenAI from the browser you'll leak the key. Prefer a server endpoint that holds the key.

Recommended setups:

1) For local development of the client only (not recommended for production):
	- Create a file `.env.local` in the project root and add a variable using the `VITE_` prefix, for example:

	  VITE_OPENAI_API_KEY=sk-REDACTED

	- Restart the Vite dev server. Access the value in client code as `import.meta.env.VITE_OPENAI_API_KEY`.

2) For server-side scripts or Node processes (safe for secrets):
	- Create `.env.local` with `OPENAI_API_KEY=sk-REDACTED` (no VITE_ prefix needed).
	- Install `dotenv` (one-time): `npm install dotenv --save`.
	- In your Node script load it early with `import 'dotenv/config'` or `import dotenv from 'dotenv'; dotenv.config();` and then read `process.env.OPENAI_API_KEY`.

If you put a real key in `.env.example` it will not be loaded by Vite or Node by default — `.env.example` is a checked-in template and should only contain placeholder values. Move the real key to `.env.local` and add `.env.local` to `.gitignore`.

If your OpenAI key still isn't recognized after following the above, tell me how you're trying to read it (client code using import.meta.env or a Node script using process.env) and I'll provide the exact minimal change.
