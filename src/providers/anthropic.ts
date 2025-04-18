import Anthropic from "@anthropic-ai/sdk";
import type { LLMModel } from "../types/models";
import type { BaseGenerateParams } from "../types/params";
import type { LLMResponse } from "../types/responses";
import { BaseLLMProvider, type StreamWithMetadata, type TokenMetadata } from "./base";

/**
 * Anthropic Provider Implementation
 */
export class AnthropicProvider extends BaseLLMProvider {
  private client: Anthropic | null = null;
  protected DEFAULT_MODEL: LLMModel = "claude-3-5-haiku-latest";
  private DEFAULT_MAX_TOKENS = 8192;

  constructor(apiKey?: string) {
    super(apiKey);
    this.initClient();
  }

  /**
   * Initialize the Anthropic client with API key
   */
  protected initClient(): void {
    try {
      this.client = new Anthropic({
        apiKey: this.apiKey || process.env.ANTHROPIC_API_KEY || "",
      });
    } catch (error) {
      // Initialize client as null if API key is missing
      // Actual error will be thrown when trying to use the client
      console.warn("Anthropic client initialization failed. API calls will error.");
    }
  }

  /**
   * Check if client is initialized and throw error if not
   */
  protected checkClientInitialized(): void {
    if (!this.client) {
      throw new Error("Anthropic client not initialized - API key may be missing");
    }
  }

  /**
   * Process content parts (text, images, audio)
   * For Anthropic, create the content array for the message
   */
  protected buildContentParts(params: BaseGenerateParams): any {
    const content: any[] = [];

    // Add text content
    if (params.prompt) {
      content.push({ type: "text", text: params.prompt });
    }

    // Add images if provided
    if (params.image) {
      const images = Array.isArray(params.image) ? params.image : [params.image];
      for (const image of images) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: image,
          },
        });
      }
    }

    // Note: Anthropic may not support audio in the same way as other providers
    // This implementation may need adjustment based on their specific API

    // For Anthropic, if we only have text (no images), we can use a simpler format
    if (content.length === 1 && content[0].type === "text") {
      return [{ role: "user", content: params.prompt }];
    }

    // Otherwise, return the multimodal format
    return [{ role: "user", content }];
  }

  /**
   * Make the actual API call to generate content
   * Note: Since Anthropic only works with streaming, we simulate non-streaming
   * by collecting all stream chunks into a single response
   */
  protected async makeGenerationRequest(params: BaseGenerateParams): Promise<any> {
    this.checkClientInitialized();

    const model = this.getModelName(params);
    const messages = this.buildContentParts(params);

    // Create the stream
    const stream = this.client!.messages.stream({
      messages,
      model,
      max_tokens: params.maxTokens || this.DEFAULT_MAX_TOKENS,
      temperature: params.temperature,
    });
    // Get the final message which includes usage information
    const finalMessage = await stream.finalMessage();

    return {
      content: finalMessage.content.map((c) => (c.type === "text" ? c.text : "")).join(""),
      usage: finalMessage.usage || { input_tokens: 0, output_tokens: 0 },
      model,
    };
  }

  /**
   * Make the actual API call to generate streaming content
   */
  protected async makeStreamingRequest(params: BaseGenerateParams): Promise<any> {
    this.checkClientInitialized();

    const model = this.getModelName(params);
    const messages = this.buildContentParts(params);

    // Return the stream for processing
    return this.client!.messages.stream({
      messages,
      model,
      max_tokens: params.maxTokens || this.DEFAULT_MAX_TOKENS,
      temperature: params.temperature,
    });
  }

  /**
   * Extract text from API response
   */
  protected extractTextFromResponse(response: any): string {
    return response.content || "";
  }

  /**
   * Extract metadata from API response
   */
  protected extractMetadataFromResponse(response: any, modelName: string): TokenMetadata {
    const usage = response.usage || { input_tokens: 0, output_tokens: 0 };
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;

    return this.createTokenMetadata(modelName, inputTokens, outputTokens);
  }

  /**
   * Create a promise that resolves with metadata from a stream
   */
  protected async createMetadataPromiseFromStream(streamResult: any, modelName: string): Promise<TokenMetadata> {
    try {
      // Get the final message with usage information
      const finalMessage = await streamResult.finalMessage();
      const usage = finalMessage.usage || { input_tokens: 0, output_tokens: 0 };

      return this.createTokenMetadata(modelName, usage.input_tokens || 0, usage.output_tokens || 0);
    } catch (error) {
      console.warn("Error getting token usage from finalMessage", error);
      return this.createTokenMetadata(modelName, 0, 0);
    }
  }

  /**
   * Extract text chunks from a stream
   */
  protected extractTextChunksFromStream(streamResult: any): AsyncIterable<string> {
    return {
      [Symbol.asyncIterator]() {
        const textQueue: string[] = [];
        let resolveNext: ((value: IteratorResult<string, any>) => void) | null = null;
        let rejectNext: ((reason?: any) => void) | null = null;
        let streamEnded = false;
        let streamError: Error | null = null;

        // Set up the event handlers for text events
        streamResult.on("text", (text: string) => {
          if (text) {
            if (resolveNext) {
              const r = resolveNext;
              resolveNext = null;
              r({ value: text, done: false });
            } else {
              textQueue.push(text);
            }
          }
        });

        streamResult.on("error", (error: Error) => {
          streamError = error;
          if (rejectNext) {
            const r = rejectNext;
            rejectNext = null;
            r(error);
          }
        });

        streamResult.on("end", () => {
          streamEnded = true;
          if (resolveNext) {
            const r = resolveNext;
            resolveNext = null;
            r({ value: undefined, done: true });
          }
        });

        return {
          next() {
            // If we have queued items, return immediately
            if (textQueue.length > 0) {
              return Promise.resolve({ value: textQueue.shift()!, done: false });
            }

            // If the stream has ended, we're done
            if (streamEnded) {
              return Promise.resolve({ value: undefined, done: true });
            }

            // If there was an error, reject
            if (streamError) {
              return Promise.reject(streamError);
            }

            // Otherwise, wait for the next event
            return new Promise<IteratorResult<string>>((resolve, reject) => {
              resolveNext = resolve;
              rejectNext = reject;
            });
          },
        };
      },
    };
  }

  /**
   * Override the generateStream method to properly handle Anthropic's event-based stream
   */
  public generateStream(params: BaseGenerateParams): StreamWithMetadata {
    this.checkClientInitialized();

    const modelName = this.getModelName(params);
    const messages = this.buildContentParts(params);

    // Create the stream
    const streamResult = this.client!.messages.stream({
      messages,
      model: modelName,
      max_tokens: params.maxTokens || this.DEFAULT_MAX_TOKENS,
      temperature: params.temperature,
    });

    // Create the AsyncIterable for the stream
    const stream = this.extractTextChunksFromStream(streamResult);

    // Create a function to get metadata from the stream
    const getMetadata = () => this.createMetadataPromiseFromStream(streamResult, modelName);

    // Return the StreamWithMetadata interface
    return {
      stream,
      getMetadata,
    };
  }

  /**
   * Override generateWithCallbacks to properly handle token usage data with Anthropic
   */
  public async generateWithCallbacks(
    params: BaseGenerateParams & {
      onChunk?: (chunk: string) => void;
      onComplete?: (response: LLMResponse) => void;
      onError?: (error: any) => void;
    }
  ): Promise<void> {
    this.checkClientInitialized();

    const { onChunk, onComplete, onError } = params;
    const modelName = this.getModelName(params);
    const messages = this.buildContentParts(params);

    try {
      // Approach 1: Use stream like in the non-streaming API but collect chunks
      const accumulatedContent: string[] = [];

      const streamRequest = this.client!.messages.stream({
        messages,
        model: modelName,
        max_tokens: params.maxTokens || this.DEFAULT_MAX_TOKENS,
        temperature: params.temperature,
      });

      // Create a Promise to handle the callback flow
      await new Promise<void>((resolve, reject) => {
        streamRequest.on("text", (text) => {
          // Save the chunk
          accumulatedContent.push(text);

          // Call the onChunk callback
          if (onChunk) {
            onChunk(text);
          }
        });

        streamRequest.on("error", (error) => {
          console.error("Stream error in generateWithCallbacks:", error);
          if (onError) {
            onError(error);
          }
          reject(error);
        });

        streamRequest.on("end", async () => {
          try {
            // Once streaming is done, make a separate request to get token usage
            // This is the same approach that works in makeGenerationRequest
            const completionRequest = this.client!.messages.stream({
              messages,
              model: modelName,
              max_tokens: params.maxTokens || this.DEFAULT_MAX_TOKENS,
              temperature: params.temperature,
            });

            // Get token usage from finalMessage
            const finalMessage = await completionRequest.finalMessage();
            const fullText = accumulatedContent.join("");

            // Extract usage information
            const usage = finalMessage.usage || { input_tokens: 0, output_tokens: 0 };

            // Create metadata
            const metadata = this.createTokenMetadata(modelName, usage.input_tokens || 0, usage.output_tokens || 0);

            // Call onComplete callback
            if (onComplete) {
              onComplete({
                text: fullText,
                metadata,
              });
            }

            resolve();
          } catch (error) {
            console.error("Error getting token usage in generateWithCallbacks:", error);

            // Still complete with the content we have, just without token info
            if (onComplete) {
              onComplete({
                text: accumulatedContent.join(""),
                metadata: this.createTokenMetadata(modelName, 0, 0),
              });
            }

            resolve();
          }
        });
      });
    } catch (error) {
      console.error("Error in generateWithCallbacks:", error);
      if (onError) {
        onError(error);
      }
    }
  }
}
