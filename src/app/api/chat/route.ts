import { convertToModelMessages, streamText, type UIMessage } from "ai";

import {
  chatGenerationSettings,
  chatSystemPrompt,
  getChatModel,
} from "@/lib/ai-config";

export const maxDuration = 30;

function isUIMessageArray(value: unknown): value is UIMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        "role" in item &&
        "parts" in item,
    )
  );
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "Missing ANTHROPIC_API_KEY. Add it to .env.local on the server and restart the dev server.",
      },
      { status: 500 },
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const messages = (body as { messages?: unknown }).messages;

  if (!isUIMessageArray(messages) || messages.length === 0) {
    return Response.json(
      { error: "Request must include a non-empty messages array." },
      { status: 400 },
    );
  }

  try {
    const result = streamText({
      model: getChatModel(),
      system: chatSystemPrompt,
      messages: await convertToModelMessages(messages),
      abortSignal: req.signal,
      ...chatGenerationSettings,
      onError: ({ error }) => {
        console.error("[/api/chat] stream error:", error);
      },
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      // Abhi debugging ke liye asli error dikha rahe hain.
      // Sab theek hone ke baad isse generic message se badal dena.
      onError: (error) =>
        error instanceof Error ? error.message : String(error),
    });
  } catch (error) {
    console.error("[/api/chat]", error);

    return Response.json(
      { error: "The assistant could not complete that response." },
      { status: 500 },
    );
  }
}
