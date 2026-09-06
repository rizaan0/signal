import "server-only";

export type ToolCall = {
  id: string;
  name: string;
  args: unknown;
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
      "LLM not configured. Implement completeTurn in src/lib/llm.ts and set LLM_* env vars.",
    );
    this.name = "LlmNotConfiguredError";
  }
}

export async function completeTurn(_input: {
  messages: AgentMessage[];
  tools: { name: string; description: string; schema: unknown }[];
}): Promise<LlmTurn> {
  throw new LlmNotConfiguredError();
}
