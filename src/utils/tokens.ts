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

  let inputCost = 0;
  let outputCost = 0;

  // Handle tiered pricing if available
  if (pricing.tieredPricing) {
    // Calculate input cost with tiered pricing
    if (pricing.tieredPricing.input) {
      const { threshold, belowThreshold, aboveThreshold } = pricing.tieredPricing.input;
      
      if (inputTokens <= threshold) {
        // All tokens are below threshold
        inputCost = (inputTokens / 1_000_000) * belowThreshold;
      } else {
        // Split between tiers
        const belowThresholdCost = (threshold / 1_000_000) * belowThreshold;
        const aboveThresholdCost = ((inputTokens - threshold) / 1_000_000) * aboveThreshold;
        inputCost = belowThresholdCost + aboveThresholdCost;
      }
    }

    // Calculate output cost with tiered pricing
    if (pricing.tieredPricing.output) {
      const { threshold, belowThreshold, aboveThreshold } = pricing.tieredPricing.output;
      
      if (outputTokens <= threshold) {
        // All tokens are below threshold
        outputCost = (outputTokens / 1_000_000) * belowThreshold;
      } else {
        // Split between tiers
        const belowThresholdCost = (threshold / 1_000_000) * belowThreshold;
        const aboveThresholdCost = ((outputTokens - threshold) / 1_000_000) * aboveThreshold;
        outputCost = belowThresholdCost + aboveThresholdCost;
      }
    }
  } else {
    // Use standard pricing
    if (pricing.inputTokens) {
      inputCost = (inputTokens / 1_000_000) * pricing.inputTokens;
    }
    
    if (pricing.outputTokens) {
      outputCost = (outputTokens / 1_000_000) * pricing.outputTokens;
    }
  }

  // Return total cost rounded to 20 decimal places
  return Number.parseFloat((inputCost + outputCost).toFixed(20));
}
