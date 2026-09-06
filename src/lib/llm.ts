import "server-only";

// Pluggable LLM interface — swap in any provider by implementing this function.
// Set LLM_* env vars and replace the body when a provider is chosen.

export async function complete(prompt: string): Promise<string> {
  // No provider configured yet. Return the prompt as-is for testing.
  // Replace this with e.g. OpenAI, Anthropic, or any other provider.
  console.warn("llm.complete called but no provider is configured. Returning echo.");
  return prompt;
}
