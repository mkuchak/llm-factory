/**
 * Available LLM models
 */
export type LLMModel =
  // OpenAI models
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano"
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4o-audio-preview"
  | "gpt-4o-mini-audio-preview"
  // Google models
  | "gemini-2.5-pro-preview-03-25"
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-lite"
  // Anthropic models
  | "claude-3-7-sonnet-latest"
  | "claude-3-5-haiku-latest";

/**
 * Provider types
 */
export type LLMProvider = "openai" | "google" | "anthropic";

/**
 * Map of models to their providers
 */
export const MODEL_PROVIDER_MAP: Record<LLMModel, LLMProvider> = {
  "gpt-4.1": "openai",
  "gpt-4.1-mini": "openai",
  "gpt-4.1-nano": "openai",
  "gpt-4o": "openai",
  "gpt-4o-mini": "openai",
  "gpt-4o-audio-preview": "openai",
  "gpt-4o-mini-audio-preview": "openai",
  "gemini-2.5-pro-preview-03-25": "google",
  "gemini-2.0-flash": "google",
  "gemini-2.0-flash-lite": "google",
  "claude-3-7-sonnet-latest": "anthropic",
  "claude-3-5-haiku-latest": "anthropic",
};
