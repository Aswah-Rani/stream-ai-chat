# Streaming AI Chat

A Next.js App Router chat app that streams Claude responses with the AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`), TypeScript, and Tailwind CSS.

The Anthropic API key is read only on the server from `process.env.ANTHROPIC_API_KEY`. It is never sent to the browser.

## Prerequisites

- Node.js 20 or later
- An [Anthropic API key](https://console.anthropic.com/)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the project root (this file is gitignored):

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Do **not** use `NEXT_PUBLIC_ANTHROPIC_API_KEY`. A public prefix would expose the key in client bundles.

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

You can change the Claude model, system prompt, temperature, and output token limit in `src/lib/ai-config.ts`. Restart the dev server after changing `.env.local`.

## Scripts

```bash
npm run dev     # development server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # ESLint
```

## How it works

- `src/components/chat.tsx` uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport` posting to `/api/chat`.
- `src/app/api/chat/route.ts` converts UI messages with `convertToModelMessages`, calls `streamText`, and returns a UI message stream.
- Conversation history is sent on every turn. Stopping generation keeps partial assistant text in the thread.
- Auto-scroll follows new tokens only when you are already near the bottom. Scroll up to read, then use **Jump to latest**.

## Deployment (Vercel)

1. Push the repo and import it in [Vercel](https://vercel.com/new).
2. Add `ANTHROPIC_API_KEY` under Project Settings → Environment Variables for Production (and Preview if you need it).
3. Deploy. Do not commit `.env.local`.

Other hosts that run Next.js work the same way: set `ANTHROPIC_API_KEY` in the server environment, then run `npm run build` and `npm start`.
