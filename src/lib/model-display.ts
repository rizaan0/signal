export type ModelDisplay = {
  name: string;
  description: string;
};

const MODEL_DISPLAY: Record<string, ModelDisplay> = {
  "gemini-3.5-flash": { name: "Gemini 3.5 Flash", description: "Fast and capable" },
  "gemini-3.5-pro": { name: "Gemini 3.5 Pro", description: "Higher quality" },
  "gemini-3.7-flash": { name: "Gemini 3.7 Flash", description: "Fast and capable" },
  "gemini-2.5-flash": { name: "Gemini 2.5 Flash", description: "Fast and capable" },
  "gemini-2.0-flash": { name: "Gemini 2.0 Flash", description: "Fast and capable" },
  "gemini-1.5-flash": { name: "Gemini 1.5 Flash", description: "Fast and capable" },
  "gemini-1.5-pro": { name: "Gemini 1.5 Pro", description: "Higher quality" },
};

export function formatModelId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) return "Gemini";
  return trimmed
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => {
      if (/^\d+(\.\d+)*$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

export function modelDisplayName(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) return "Gemini";
  const mapped = MODEL_DISPLAY[trimmed.toLowerCase()]?.name;
  if (mapped) return mapped;
  if (/\s/.test(trimmed)) return trimmed;
  return formatModelId(trimmed);
}

export function modelDescription(id: string): string {
  return MODEL_DISPLAY[id.trim().toLowerCase()]?.description ?? "";
}

export const THINKING_LEVEL_COPY = {
  low: { label: "Low", description: "Instant, no overthinking" },
  medium: { label: "Medium", description: "Good for most things" },
  high: { label: "High", description: "Slower, digs deeper" },
} as const;
