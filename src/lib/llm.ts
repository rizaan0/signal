import "server-only";
import { randomUUID } from "crypto";

export type ToolCall = {
  id: string;
  name: string;
  args: unknown;
  thoughtSignature?: string;
};

export type AgentMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content?: string; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; name: string; content: string };

export type LlmTurn = {
  text?: string;
  toolCalls?: ToolCall[];
};

export class LlmNotConfiguredError extends Error {
  constructor() {
    super(
      "LLM not configured. Set LLM_PROVIDER, LLM_API_KEY, and LLM_MODEL in .env.",
    );
    this.name = "LlmNotConfiguredError";
  }
}

const SYSTEM_INSTRUCTION = `You are Signal, an inbox agent for Gmail.
Use the provided tools to search, read, and act on mail.
Never invent Gmail message ids — search or fetch first, then pass real ids to write tools.
Write tools (archive, trash, star, send, reply) are executed only after the user confirms in the app.
Be concise. After tools return, summarize what you found or what will happen.`;

type GeminiPart = {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: { id?: string; name?: string; args?: Record<string, unknown> };
  functionResponse?: {
    id?: string;
    name: string;
    response: Record<string, unknown>;
  };
};

type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

function provider(): string {
  return (process.env.LLM_PROVIDER ?? "").trim().toLowerCase();
}

function apiKey(): string {
  return (
    process.env.LLM_API_KEY ??
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    ""
  ).trim();
}

function modelName(): string {
  return (process.env.LLM_MODEL ?? "gemini-3.7-flash").trim();
}

function parseToolPayload(content: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(content);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { result: parsed as unknown };
  } catch {
    return { result: content };
  }
}

function toGeminiContents(messages: AgentMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = [];

  for (const message of messages) {
    if (message.role === "user") {
      contents.push({ role: "user", parts: [{ text: message.content }] });
      continue;
    }

    if (message.role === "assistant") {
      const parts: GeminiPart[] = [];
      if (message.content?.trim()) {
        parts.push({ text: message.content });
      }
      for (const call of message.toolCalls ?? []) {
        const part: GeminiPart = {
          functionCall: {
            id: call.id,
            name: call.name,
            args:
              call.args && typeof call.args === "object"
                ? (call.args as Record<string, unknown>)
                : {},
          },
        };
        if (call.thoughtSignature) {
          part.thoughtSignature = call.thoughtSignature;
        }
        parts.push(part);
      }
      if (parts.length > 0) {
        contents.push({ role: "model", parts });
      }
      continue;
    }

    contents.push({
      role: "user",
      parts: [
        {
          functionResponse: {
            id: message.toolCallId,
            name: message.name,
            response: parseToolPayload(message.content),
          },
        },
      ],
    });
  }

  return contents;
}

async function completeGemini(input: {
  messages: AgentMessage[];
  tools: { name: string; description: string; schema: unknown }[];
}): Promise<LlmTurn> {
  const key = apiKey();
  if (!key) throw new LlmNotConfiguredError();

  const functionDeclarations = input.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters:
      tool.schema && typeof tool.schema === "object"
        ? tool.schema
        : { type: "object", properties: {} },
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName())}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: toGeminiContents(input.messages),
        tools: [{ functionDeclarations }],
        toolConfig: {
          functionCallingConfig: { mode: "AUTO" },
        },
      }),
    },
  );

  const body = (await res.json()) as {
    error?: { message?: string };
    candidates?: Array<{
      content?: { parts?: GeminiPart[] };
    }>;
  };

  if (!res.ok) {
    throw new Error(body.error?.message ?? `Gemini request failed (${res.status})`);
  }

  const parts = body.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((part) => part.text && !part.thought)
    .map((part) => part.text)
    .join("\n")
    .trim();

  const toolCalls: ToolCall[] = [];
  for (const part of parts) {
    if (!part.functionCall?.name) continue;
    toolCalls.push({
      id: part.functionCall.id || randomUUID(),
      name: part.functionCall.name,
      args: part.functionCall.args ?? {},
      thoughtSignature: part.thoughtSignature,
    });
  }

  return {
    text: text || undefined,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

export async function completeTurn(input: {
  messages: AgentMessage[];
  tools: { name: string; description: string; schema: unknown }[];
}): Promise<LlmTurn> {
  const kind = provider();
  if (!apiKey()) throw new LlmNotConfiguredError();

  if (kind === "google" || kind === "gemini" || kind === "") {
    return completeGemini(input);
  }

  throw new Error(
    `Unsupported LLM_PROVIDER "${kind}". Use "google" (Gemini) with LLM_API_KEY and LLM_MODEL.`,
  );
}
