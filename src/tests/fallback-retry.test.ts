import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LLMFactory } from "../llm-factory";
import { OpenAIProvider, GoogleProvider } from "../providers";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Mock only the providers that should fail
vi.mock("../providers/openai", () => {
  return {
    OpenAIProvider: vi.fn().mockImplementation(() => {
      return {
        generate: vi.fn().mockRejectedValue(new Error("OpenAI API error: simulated failure")),
        generateStream: vi.fn().mockRejectedValue(new Error("OpenAI API streaming error: simulated failure")),
        generateWithCallbacks: vi.fn().mockImplementation(({ onError }) => {
          onError(new Error("OpenAI API callback error: simulated failure"));
        }),
        generateReadableStream: vi
          .fn()
          .mockRejectedValue(new Error("OpenAI API readable stream error: simulated failure")),
      };
    }),
  };
});

vi.mock("../providers/google", () => {
  return {
    GoogleProvider: vi.fn().mockImplementation(() => {
      return {
        generate: vi.fn().mockRejectedValue(new Error("Google API error: simulated failure")),
        generateStream: vi.fn().mockRejectedValue(new Error("Google API streaming error: simulated failure")),
        generateWithCallbacks: vi.fn().mockImplementation(({ onError }) => {
          onError(new Error("Google API callback error: simulated failure"));
        }),
        generateReadableStream: vi
          .fn()
          .mockRejectedValue(new Error("Google API readable stream error: simulated failure")),
      };
    }),
  };
});

// Check if we have a valid API key for Anthropic
const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
const skipIfNoAnthropicKey = hasAnthropicKey ? it : it.skip;

describe("Fallback and Retry Functionality", () => {
  // Preserve original console.warn to avoid polluting test output
  const originalWarn = console.warn;

  beforeEach(() => {
    // Mock console.warn to reduce noise in test output
    console.warn = vi.fn();

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original console.warn
    console.warn = originalWarn;
  });

  skipIfNoAnthropicKey("should fallback to next model when first model fails", async () => {
    // Create a factory with real API keys
    const factory = new LLMFactory({
      openaiApiKey: "will-use-mocked-provider",
      googleApiKey: "will-use-mocked-provider",
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Try to generate with models that will fail until reaching Anthropic
    const response = await factory.generate({
      model: ["gpt-4.1-nano", "gemini-2.0-flash-lite", "claude-3-5-haiku-latest"],
      prompt: "Say 'model fallback success' if you received this message",
      retries: 1, // Just 1 retry per model to keep the test fast
    });

    // The response should come from the Anthropic model
    expect(response.text).toContain("model fallback success");
    expect(response.metadata.model).toBe("claude-3-5-haiku-latest");

    // Verify the retry behavior occurred - OpenAI and Google should have been attempted
    const warnCalls = (console.warn as any).mock.calls;
    const hasOpenAIFailure = warnCalls.some((call: any[]) =>
      call[0].includes("Generation failed with model gpt-4.1-nano")
    );
    const hasGoogleFailure = warnCalls.some((call: any[]) =>
      call[0].includes("Generation failed with model gemini-2.0-flash-lite")
    );

    expect(hasOpenAIFailure).toBe(true);
    expect(hasGoogleFailure).toBe(true);
  });

  it("should retry the specified number of times before moving to next model", async () => {
    // Create a factory with mocked providers (all will fail)
    const factory = new LLMFactory({
      openaiApiKey: "will-use-mocked-provider",
      googleApiKey: "will-use-mocked-provider",
      anthropicApiKey: "no-key-provided",
    });

    // Mock console.warn to spy on retry attempts
    const warnSpy = vi.spyOn(console, "warn");

    // Try generating with just one model but multiple retries
    try {
      await factory.generate({
        model: "gpt-4.1-nano", // OpenAI model (mocked to fail)
        prompt: "This should fail",
        retries: 3, // Should try 3 times before giving up
      });

      // If we get here, the test should fail because all providers should fail
      expect(true).toBe(false); // This should not be reached
    } catch (error) {
      // Check that the error message mentions all models failed
      expect((error as Error).message).toContain("All models failed after retries");

      // Get warning messages related to generation failures
      const generationWarnings = warnSpy.mock.calls.filter((call) =>
        call[0].includes("Generation failed with model gpt-4.1-nano")
      );

      // There should be 3 generation failure warnings (for the 3 retry attempts)
      expect(generationWarnings.length).toBe(3);
    }
  });

  skipIfNoAnthropicKey("should handle streaming with model fallback", async () => {
    // Create a factory with real API keys but mocked failing providers
    const factory = new LLMFactory({
      openaiApiKey: "will-use-mocked-provider",
      googleApiKey: "will-use-mocked-provider",
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Use streams with fallback from OpenAI -> Google -> Anthropic
    const { stream, getMetadata } = factory.generateStream({
      model: ["gpt-4.1-nano", "gemini-2.0-flash-lite", "claude-3-5-haiku-latest"],
      prompt: "Say 'streaming fallback success' if you received this message",
      retries: 1,
    });

    // Collect all stream chunks
    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Combine all chunks
    const fullText = chunks.join("");
    expect(fullText).toContain("streaming fallback success");

    // Check metadata to verify we used the correct model
    const metadata = await getMetadata();
    expect(metadata.model).toBe("claude-3-5-haiku-latest");
  });

  skipIfNoAnthropicKey("should handle callbacks with model fallback", async () => {
    // Create a factory with real API keys but mocked failing providers
    const factory = new LLMFactory({
      openaiApiKey: "will-use-mocked-provider",
      googleApiKey: "will-use-mocked-provider",
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Return a promise that resolves when onComplete is called
    return new Promise<void>((resolve, reject) => {
      const chunks: string[] = [];

      factory.generateWithCallbacks({
        model: ["gpt-4.1-nano", "gemini-2.0-flash-lite", "claude-3-5-haiku-latest"],
        prompt: "Say 'callback fallback success' if you received this message",
        retries: 1,
        onChunk: (chunk) => {
          chunks.push(chunk);
        },
        onComplete: (response) => {
          try {
            const fullText = chunks.join("");

            // Verify the response contains the expected text
            expect(fullText).toContain("callback fallback success");

            // Verify the model is the one we expected after fallback
            expect(response.metadata.model).toBe("claude-3-5-haiku-latest");

            resolve();
          } catch (error) {
            reject(error);
          }
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  });

  skipIfNoAnthropicKey("should handle ReadableStream with model fallback", async () => {
    // Create a factory with real API keys but mocked failing providers
    const factory = new LLMFactory({
      openaiApiKey: "will-use-mocked-provider",
      googleApiKey: "will-use-mocked-provider",
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Use ReadableStream with fallback from OpenAI -> Google -> Anthropic
    const { stream, getMetadata } = factory.generateReadableStream({
      model: ["gpt-4.1-nano", "gemini-2.0-flash-lite", "claude-3-5-haiku-latest"],
      prompt: "Say 'readable stream fallback success' if you received this message",
      retries: 1,
    });

    // Read from the ReadableStream
    const reader = stream.getReader();
    const chunks: string[] = [];

    // Process all chunks
    let done = false;
    while (!done) {
      const { value, done: isDone } = await reader.read();
      if (isDone) {
        done = true;
      } else {
        chunks.push(value);
      }
    }

    // Combine all chunks
    const fullText = chunks.join("");
    expect(fullText).toContain("readable stream fallback success");

    // Check metadata to verify we used the correct model
    const metadata = await getMetadata();
    expect(metadata.model).toBe("claude-3-5-haiku-latest");
  });
});
