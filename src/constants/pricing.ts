import type { LLMModel } from "../types/models";

/**
 * Pricing per million tokens
 */
export interface TokenPricing {
  inputTokens: number; // cost per 1M tokens
  outputTokens: number; // cost per 1M tokens
}

/**
 * Model pricing in USD per million tokens
 */
export const MODEL_PRICING: Record<LLMModel, TokenPricing> = {
  "gpt-4o": {
    inputTokens: 2.5,
    outputTokens: 10.0,
  },
  "gpt-4o-mini": {
    inputTokens: 0.15,
    outputTokens: 0.6,
  },
  "gpt-4o-audio-preview": {
    inputTokens: 2.5,
    outputTokens: 10.0,
  },
  "gpt-4o-mini-audio-preview": {
    inputTokens: 0.15,
    outputTokens: 0.6,
  },
  "gemini-2.5-pro-exp-03-25": {
    inputTokens: 0.0, // free experimental model
    outputTokens: 0.0, // free experimental model
  },
  "gemini-2.0-flash": {
    inputTokens: 0.1,
    outputTokens: 0.4,
  },
  "gemini-2.0-flash-lite": {
    inputTokens: 0.075,
    outputTokens: 0.3,
  },
  "claude-3-7-sonnet-latest": {
    inputTokens: 3.0,
    outputTokens: 15.0,
  },
  "claude-3-5-haiku-latest": {
    inputTokens: 0.8,
    outputTokens: 4.0,
  },
};
