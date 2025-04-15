import type { LLMModel } from "../types/models";

/**
 * Pricing per million tokens
 */
export interface TokenPricing {
  // Simple fixed pricing
  inputTokens?: number; // cost per 1M tokens
  outputTokens?: number; // cost per 1M tokens
  
  // Tiered pricing
  tieredPricing?: {
    input?: {
      threshold: number; // token threshold for tier change
      belowThreshold: number; // cost per 1M tokens below threshold
      aboveThreshold: number; // cost per 1M tokens above threshold
    };
    output?: {
      threshold: number; // token threshold for tier change
      belowThreshold: number; // cost per 1M tokens below threshold
      aboveThreshold: number; // cost per 1M tokens above threshold
    };
  };
}

/**
 * Model pricing in USD per million tokens
 */
export const MODEL_PRICING: Record<LLMModel, TokenPricing> = {
  "gpt-4.1": {
    inputTokens: 2.00,
    outputTokens: 8.00,
  },
  "gpt-4.1-mini": {
    inputTokens: 0.40,
    outputTokens: 1.60,
  },
  "gpt-4.1-nano": {
    inputTokens: 0.10,
    outputTokens: 0.40,
  },
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
  "gemini-2.5-pro-preview-03-25": {
    tieredPricing: {
      input: {
        threshold: 200_000,
        belowThreshold: 1.25,
        aboveThreshold: 2.50,
      },
      output: {
        threshold: 200_000,
        belowThreshold: 10.0,
        aboveThreshold: 15.0,
      }
    }
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
