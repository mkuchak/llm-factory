import { MODEL_PRICING } from "../constants/pricing";
import type { LLMModel } from "../types/models";

/**
 * Calculate the cost based on tokens and model
 */
export function calculateCost(model: LLMModel, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    throw new Error(`No pricing information available for model: ${model}`);
  }

  // Calculate cost in USD (pricing is per 1M tokens)
  const inputCost = (inputTokens / 1_000_000) * pricing.inputTokens;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputTokens;

  // Return total cost rounded to 20 decimal places
  return Number.parseFloat((inputCost + outputCost).toFixed(20));
}
