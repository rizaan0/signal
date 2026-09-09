import "server-only";
import { randomUUID } from "crypto";
import {
  completeTurn,
  type AgentMessage,
  type ThinkingLevel,
  type ToolCall,
} from "@/lib/llm";
import {
  executeTool,
  isAllowedTool,
  listToolDescriptors,
  toolRequiresApproval,
} from "@/lib/gmail-tools";

export type { AgentMessage, ToolCall };

export type AgentRun = {
  id: string;
  status: "pending_approval" | "cancelled" | "done" | "error";
  messages: AgentMessage[];
  thinkingLevel: ThinkingLevel;
  pendingToolCall?: ToolCall;
};

const MAX_TURNS = 8;

function lastAssistantText(messages: AgentMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant" && m.content?.trim()) return m.content;
  }
  return "";
}

export function displayRunText(run: AgentRun): string {
  if (run.status === "pending_approval" && run.pendingToolCall) {
    const preface = lastAssistantText(run.messages);
    return preface || "Review this action before it runs.";
  }
  if (run.status === "error") {
    return lastAssistantText(run.messages) || "The agent stopped without a response.";
  }
  return lastAssistantText(run.messages) || "Done.";
}

async function loop(userId: string, run: AgentRun): Promise<AgentRun> {
  const tools = listToolDescriptors();
  const ctx = { userId, runId: run.id };

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const result = await completeTurn({
      messages: run.messages,
      tools,
      thinkingLevel: run.thinkingLevel,
    });
    const toolCalls = result.toolCalls ?? [];

    if (toolCalls.length === 0) {
      run.messages.push({ role: "assistant", content: result.text ?? "" });
      run.status = "done";
      delete run.pendingToolCall;
      return run;
    }

    run.messages.push({
      role: "assistant",
      content: result.text,
      toolCalls,
    });

    for (const call of toolCalls) {
      if (!isAllowedTool(call.name)) {
        run.messages.push({
          role: "tool",
          toolCallId: call.id,
          name: call.name,
          content: JSON.stringify({ error: `Unknown tool: ${call.name}` }),
        });
        continue;
      }

      if (toolRequiresApproval(call.name)) {
        run.status = "pending_approval";
        run.pendingToolCall = call;
        return run;
      }

      try {
        const content = await executeTool(call.name, ctx, call.args);
        run.messages.push({
          role: "tool",
          toolCallId: call.id,
          name: call.name,
          content,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Tool failed.";
        run.messages.push({
          role: "tool",
          toolCallId: call.id,
          name: call.name,
          content: JSON.stringify({ error: message }),
        });
      }
    }
  }

  run.status = "error";
  run.messages.push({
    role: "assistant",
    content: "Stopped after too many tool steps. Try a narrower request.",
  });
  delete run.pendingToolCall;
  return run;
}

export async function runAgent(opts: {
  userId: string;
  history: AgentMessage[];
  thinkingLevel: ThinkingLevel;
}): Promise<AgentRun> {
  const run: AgentRun = {
    id: randomUUID(),
    status: "done",
    messages: opts.history,
    thinkingLevel: opts.thinkingLevel,
  };
  return loop(opts.userId, run);
}

export async function resumeAgent(opts: {
  userId: string;
  run: AgentRun;
}): Promise<AgentRun> {
  opts.run.thinkingLevel ??= "medium";
  const call = opts.run.pendingToolCall;
  if (!call || opts.run.status !== "pending_approval") {
    throw new Error("No pending tool call to approve.");
  }
  if (!isAllowedTool(call.name)) {
    throw new Error(`Unknown tool: ${call.name}`);
  }

  const ctx = { userId: opts.userId, runId: opts.run.id };
  try {
    const content = await executeTool(call.name, ctx, call.args);
    opts.run.messages.push({
      role: "tool",
      toolCallId: call.id,
      name: call.name,
      content,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Tool failed.";
    opts.run.messages.push({
      role: "tool",
      toolCallId: call.id,
      name: call.name,
      content: JSON.stringify({ error: message }),
    });
  }

  delete opts.run.pendingToolCall;
  opts.run.status = "done";
  return loop(opts.userId, opts.run);
}

export function cancelRun(run: AgentRun): AgentRun {
  return {
    ...run,
    status: "cancelled",
    pendingToolCall: undefined,
  };
}
