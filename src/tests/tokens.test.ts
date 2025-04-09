import { describe, expect, it } from "vitest";
import { calculateCost } from "../utils/tokens";

describe("calculateCost", () => {
  it("calculates cost for standard pricing models correctly", () => {
    // Test GPT-4o (standard pricing)
    const gpt4oCost = calculateCost("gpt-4o", 1000, 2000);
    // Expected: (1000/1M * 2.5) + (2000/1M * 10.0) = 0.0025 + 0.02 = 0.0225
    expect(gpt4oCost).toBeCloseTo(0.0225, 6);
    
    // Test Claude 3.5 Haiku (standard pricing)
    const haikuCost = calculateCost("claude-3-5-haiku-latest", 5000, 1000);
    // Expected: (5000/1M * 0.8) + (1000/1M * 4.0) = 0.004 + 0.004 = 0.008
    expect(haikuCost).toBeCloseTo(0.008, 6);
  });

  it("calculates cost for tiered pricing models with tokens below threshold", () => {
    // Test Gemini 2.5 Pro with tokens below threshold
    const belowThresholdCost = calculateCost("gemini-2.5-pro-preview-03-25", 100_000, 50_000);
    // Expected: 
    // Input: (100_000/1M * 1.25) = 0.125
    // Output: (50_000/1M * 10.0) = 0.5
    // Total: 0.125 + 0.5 = 0.625
    expect(belowThresholdCost).toBeCloseTo(0.625, 6);
  });

  it("calculates cost for tiered pricing models with tokens above threshold", () => {
    // Test Gemini 2.5 Pro with tokens above threshold
    const aboveThresholdCost = calculateCost("gemini-2.5-pro-preview-03-25", 300_000, 250_000);
    // Expected: 
    // Input:
    //   - First 200k: (200_000/1M * 1.25) = 0.25
    //   - Remaining 100k: (100_000/1M * 2.50) = 0.25
    //   - Total input: 0.25 + 0.25 = 0.5
    // Output:
    //   - First 200k: (200_000/1M * 10.0) = 2.0
    //   - Remaining 50k: (50_000/1M * 15.0) = 0.75
    //   - Total output: 2.0 + 0.75 = 2.75
    // Total: 0.5 + 2.75 = 3.25
    expect(aboveThresholdCost).toBeCloseTo(3.25, 6);
  });

  it("calculates cost for tiered pricing models at the threshold boundary", () => {
    // Test Gemini 2.5 Pro with tokens exactly at threshold
    const atThresholdCost = calculateCost("gemini-2.5-pro-preview-03-25", 200_000, 200_000);
    // Expected: 
    // Input: (200_000/1M * 1.25) = 0.25
    // Output: (200_000/1M * 10.0) = 2.0
    // Total: 0.25 + 2.0 = 2.25
    expect(atThresholdCost).toBeCloseTo(2.25, 6);
  });

  it("calculates cost for very large token counts correctly", () => {
    // Test with a large number of tokens (1M input, 500k output)
    const largeCost = calculateCost("gemini-2.5-pro-preview-03-25", 1_000_000, 500_000);
    // Expected: 
    // Input:
    //   - First 200k: (200_000/1M * 1.25) = 0.25
    //   - Remaining 800k: (800_000/1M * 2.50) = 2.0
    //   - Total input: 0.25 + 2.0 = 2.25
    // Output:
    //   - First 200k: (200_000/1M * 10.0) = 2.0
    //   - Remaining 300k: (300_000/1M * 15.0) = 4.5
    //   - Total output: 2.0 + 4.5 = 6.5
    // Total: 2.25 + 6.5 = 8.75
    expect(largeCost).toBeCloseTo(8.75, 6);
  });
}); 