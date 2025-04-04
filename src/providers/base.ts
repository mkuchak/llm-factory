import type { LLMModel } from "../types/models";
import type { BaseGenerateParams, GenerateWithCallbacksParams } from "../types/params";
import { type LLMResponse, StreamCallbacks } from "../types/responses";
import { calculateCost } from "../utils";

/**
 * Metadata about tokens from a stream response
 */
export interface TokenMetadata {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

/**
 * Stream result with both text and metadata
 */
export interface StreamResult {
  text: string;
  metadata: TokenMetadata;
}

/**
 * Stream with metadata accessor
 */
export interface StreamWithMetadata {
  stream: AsyncIterable<string>;
  getMetadata: () => Promise<TokenMetadata>;
}

/**
 * ReadableStream with metadata accessor
 */
export interface ReadableStreamWithMetadata {
  stream: ReadableStream<string>;
  getMetadata: () => Promise<TokenMetadata>;
}

/**
 * Base interface for LLM provider implementations
 */
export interface LLMProviderInterface {
  /**
   * Generate text from a prompt
   */
  generate(params: BaseGenerateParams): Promise<LLMResponse>;

  /**
   * Generate text with streaming, returning an object with:
   * - stream: AsyncIterable<string> for text chunks
   * - getMetadata(): Promise<TokenMetadata> to get metadata after stream completes
   */
  generateStream(params: BaseGenerateParams): StreamWithMetadata;

  /**
   * Generate text with streaming via callbacks
   */
  generateWithCallbacks(params: GenerateWithCallbacksParams): void;

  /**
   * Generate text with streaming via ReadableStream
   * Returns an object with:
   * - stream: ReadableStream<string> for text chunks
   * - getMetadata(): Promise<TokenMetadata> to get metadata after stream completes
   */
  generateReadableStream(params: BaseGenerateParams): ReadableStreamWithMetadata;
}

/**
 * Abstract base class for LLM providers
 */
export abstract class BaseLLMProvider implements LLMProviderInterface {
  // Default model to use if not specified in params
  protected abstract DEFAULT_MODEL: LLMModel;

  constructor(protected apiKey?: string) {}

  /**
   * Initialize client with API key
   * Should be called by provider implementations in constructor
   */
  protected abstract initClient(): void;

  /**
   * Check if client is initialized and throw error if not
   */
  protected abstract checkClientInitialized(): void;

  /**
   * Process content parts (text, images, audio)
   * Each provider needs to implement this based on their API format
   */
  protected abstract buildContentParts(params: BaseGenerateParams): any;

  /**
   * Make the actual API call to generate content
   * Each provider needs to implement this for their specific API
   */
  protected abstract makeGenerationRequest(params: BaseGenerateParams): Promise<any>;

  /**
   * Make the actual API call to generate streaming content
   * Each provider needs to implement this for their specific API
   */
  protected abstract makeStreamingRequest(params: BaseGenerateParams): Promise<any>;

  /**
   * Extract text from API response
   * Each provider needs to implement this based on their response format
   */
  protected abstract extractTextFromResponse(response: any): string;

  /**
   * Extract metadata from API response
   * Each provider needs to implement this based on their response format
   */
  protected abstract extractMetadataFromResponse(response: any, modelName: string): TokenMetadata;

  /**
   * Create standard token metadata object
   */
  protected createTokenMetadata(modelName: string, inputTokens = 0, outputTokens = 0): TokenMetadata {
    return {
      model: modelName,
      inputTokens,
      outputTokens,
      cost: calculateCost(modelName as LLMModel, inputTokens, outputTokens),
    };
  }

  /**
   * Format error message with provider prefix
   */
  protected formatErrorMessage(error: unknown, prefix: string): string {
    return `${prefix}: ${error instanceof Error ? error.message : String(error)}`;
  }

  /**
   * Get model name from params or use default
   */
  protected getModelName(params: BaseGenerateParams): string {
    return params.model || this.DEFAULT_MODEL;
  }

  /**
   * Generate text completion - main implementation
   */
  async generate(params: BaseGenerateParams): Promise<LLMResponse> {
    try {
      this.checkClientInitialized();

      const modelName = this.getModelName(params);
      const response = await this.makeGenerationRequest(params);
      const text = this.extractTextFromResponse(response);
      const metadata = this.extractMetadataFromResponse(response, modelName);

      return { text, metadata };
    } catch (error) {
      throw new Error(this.formatErrorMessage(error, "Generation API error"));
    }
  }

  /**
   * Generate streaming text completion - main implementation
   */
  generateStream(params: BaseGenerateParams): StreamWithMetadata {
    this.checkClientInitialized();

    const modelName = this.getModelName(params);
    let streamResult: any = null;
    let metadataPromise: Promise<TokenMetadata> | null = null;

    // Create the async generator for streaming using a self-binding function
    // to maintain 'this' context within the generator
    const stream = async function* (this: BaseLLMProvider) {
      try {
        streamResult = await this.makeStreamingRequest(params);

        // Create a promise that will resolve with the metadata after stream completes
        metadataPromise = this.createMetadataPromiseFromStream(streamResult, modelName);

        // Yield text chunks from the stream
        yield* this.extractTextChunksFromStream(streamResult);
      } catch (error) {
        throw new Error(this.formatErrorMessage(error, "Streaming API error"));
      }
    }.bind(this)();

    // Return object with stream and metadata getter
    return {
      stream,
      getMetadata: async () => {
        // If we have a metadata promise, wait for it
        if (metadataPromise) {
          return await metadataPromise;
        }

        // Fallback if something went wrong
        return this.createTokenMetadata(modelName, 0, 0);
      },
    };
  }

  /**
   * Create a promise that resolves with metadata from a stream
   * Each provider should override this based on how they retrieve stream metadata
   */
  protected abstract createMetadataPromiseFromStream(streamResult: any, modelName: string): Promise<TokenMetadata>;

  /**
   * Extract text chunks from a stream
   * Each provider should override this based on their stream format
   */
  protected abstract extractTextChunksFromStream(streamResult: any): AsyncIterable<string>;

  /**
   * Default implementation of generateWithCallbacks using generateStream
   */
  async generateWithCallbacks(params: GenerateWithCallbacksParams): Promise<void> {
    const { onChunk, onComplete, onError, ...baseParams } = params;
    try {
      let fullText = "";

      // Get stream and metadata getter
      const { stream, getMetadata } = this.generateStream(baseParams);

      // Use stream to get the streaming content
      for await (const chunk of stream) {
        fullText += chunk;
        onChunk(chunk);
      }

      // Get metadata after the stream is complete
      const metadata = await getMetadata();

      // Create response with the streamed text and metadata
      const response: LLMResponse = {
        text: fullText,
        metadata,
      };

      // Pass the complete response to the callback
      if (onComplete) {
        onComplete(response);
      }
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Default implementation of generateReadableStream using generateStream
   * Returns both the stream and a method to get metadata after stream completes
   */
  generateReadableStream(params: BaseGenerateParams): ReadableStreamWithMetadata {
    const { stream, getMetadata } = this.generateStream(params);

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream: readableStream,
      getMetadata,
    };
  }
}
