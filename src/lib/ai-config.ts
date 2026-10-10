import { anthropic } from "@ai-sdk/anthropic";

/**
 * Server-side Claude configuration for the streaming chat route.
 *
 * This module is imported only by server code (`src/app/api/chat/route.ts`).
 * Keep secrets out of here: the Anthropic provider reads `ANTHROPIC_API_KEY`
 * from `process.env` on the server. Never import this file from client
 * components, and never prefix the key with `NEXT_PUBLIC_`.
 */

/**
 * Claude model ID passed to the Anthropic provider.
 *
 * Aliases such as `claude-haiku-4-5` resolve to the current dated snapshot.
 * Switch to `claude-sonnet-4-5` for higher quality, or pin a dated ID
 * (for example `claude-haiku-4-5-20251001`) for reproducible assignments.
 */
export const chatModelId = "claude-haiku-4-5";

/**
 * System instructions applied to every turn. Conversation history is sent
 * separately via `messages`, so this prompt only needs standing behavior.
 */
export const chatSystemPrompt = `You are a helpful, concise assistant in a streaming chat UI.

- Answer the user's latest message using the full conversation history.
- Prefer clear, well-structured replies. Use short lists when they help.
- If you are unsure, say so instead of inventing facts.
- Keep everyday answers reasonably brief unless the user asks for depth.`;

/**
 * Generation settings forwarded to `streamText`.
 *
 * `temperature` controls creativity vs. focus (0 = deterministic, ~1 = more varied).
 * `maxOutputTokens` caps a single assistant reply so streams cannot run unbounded.
 */
export const chatGenerationSettings = {
  temperature: 0.7,
  maxOutputTokens: 2048,
} as const;

/** Language model instance used by the `/api/chat` route. */
export function getChatModel() {
  return anthropic(chatModelId);
}
