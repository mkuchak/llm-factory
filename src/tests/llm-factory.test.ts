import dotenv from "dotenv";
import { describe, expect, it } from "vitest";
import { LLMFactory } from "../llm-factory";

// Load environment variables
dotenv.config();

describe("LLMFactory", () => {
  it("should generate text with the default provider", async () => {
    // Create a factory instance (will use OpenAI by default if API key is available)
    const factory = new LLMFactory();

    // Generate text
    const response = await factory.generate({
      model: "gpt-4o-mini", // Specify the model
      prompt: "What are LLMs? Answer in just one sentence.",
      temperature: 0.7,
    });

    // Log the output
    console.log("Generated text:", response.text);
    console.log("Metadata:", response.metadata);

    // Basic assertions
    expect(response.text).toBeTruthy();
    expect(response.metadata).toBeDefined();
    expect(response.metadata.model).toBeTruthy();
    expect(response.metadata.inputTokens).toBeGreaterThanOrEqual(0);
    expect(response.metadata.outputTokens).toBeGreaterThanOrEqual(0);
    expect(response.metadata.cost).toBeGreaterThanOrEqual(0);
  });

  it("should generate text with the gemini-2.0-flash-lite model", async () => {
    const factory = new LLMFactory();
    const response = await factory.generate({
      model: "gemini-2.0-flash-lite", // Specify the model
      prompt: "What are LLMs? Answer in just one sentence.",
      temperature: 0.7,
    });

    console.log("Generated text (gemini-2.0-flash-lite):", response.text);
    console.log("Metadata (gemini-2.0-flash-lite):", response.metadata);

    expect(response.text).toBeTruthy();
    expect(response.metadata).toBeDefined();
    expect(response.metadata.model).toBe("gemini-2.0-flash-lite");
    expect(response.metadata.inputTokens).toBeGreaterThanOrEqual(0);
    expect(response.metadata.outputTokens).toBeGreaterThanOrEqual(0);
    expect(response.metadata.cost).toBeGreaterThanOrEqual(0);
  });
});
