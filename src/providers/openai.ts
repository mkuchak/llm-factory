import OpenAI from "openai";
import type { LLMModel } from "../types/models";
import type { BaseGenerateParams } from "../types/params";
import { BaseLLMProvider, type TokenMetadata } from "./base";

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI | null = null;
  protected DEFAULT_MODEL: LLMModel = "gpt-4o-mini";

  constructor(apiKey?: string) {
    super(apiKey);
    this.initClient();
  }

  /**
   * Initialize the OpenAI client with API key
   */
  protected initClient(): void {
    try {
      this.client = new OpenAI({
        apiKey: this.apiKey || process.env.OPENAI_API_KEY || "",
      });
    } catch (error) {
      // Initialize client as null if API key is missing
      // Actual error will be thrown when trying to use the client
      console.warn("OpenAI client initialization failed. API calls will error.");
    }
  }

  /**
   * Check if client is initialized and throw error if not
   */
  protected checkClientInitialized(): void {
    if (!this.client) {
      throw new Error("OpenAI client not initialized - API key may be missing");
    }
  }

  /**
   * Process content parts (text, images, audio)
   * For OpenAI, we need to format these as message content
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
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${image}`,
          },
        });
      }
    }

    // Add audio if provided
    // OpenAI now supports audio directly in chat completions with gpt-4o-audio-preview
    if (params.audio) {
      const audios = Array.isArray(params.audio) ? params.audio : [params.audio];
      for (const audio of audios) {
        content.push({
          type: "input_audio",
          input_audio: {
            data: audio,
            format: "mp3", // Assume mp3 format for simplicity
          },
        });
      }
    }

    // For OpenAI, if we only have text (no images/audio), we can use a simpler format
    if (content.length === 1 && content[0].type === "text") {
      return [{ role: "user", content: params.prompt }];
    }

    // Otherwise, return the multimodal format
    return [{ role: "user", content }];
  }

  /**
   * Make the actual API call to generate content
   */
  protected async makeGenerationRequest(params: BaseGenerateParams): Promise<any> {
    this.checkClientInitialized();

    // Automatically switch to audio-specific models when audio is provided
    let model = this.getModelName(params);
    if (params.audio) {
      if (model === "gpt-4o") {
        model = "gpt-4o-audio-preview";
      } else if (model === "gpt-4o-mini") {
        model = "gpt-4o-mini-audio-preview";
      }
    }

    const messages = this.buildContentParts(params);

    // Build request options
    const requestOptions: any = {
      model,
      messages,
    };

    // Add modalities if using audio - set to text only to avoid requiring audio output configuration
    if (params.audio) {
      requestOptions.modalities = ["text"];
    }

    // Add optional parameters if provided
    if (params.temperature !== undefined) {
      requestOptions.temperature = params.temperature;
    }

    if (params.maxTokens !== undefined) {
      requestOptions.max_tokens = params.maxTokens;
    }

    // Call the API
    return await this.client!.chat.completions.create(requestOptions);
  }

  /**
   * Make the actual API call to generate streaming content
   */
  protected async makeStreamingRequest(params: BaseGenerateParams): Promise<any> {
    this.checkClientInitialized();

    // Automatically switch to audio-specific models when audio is provided
    let model = this.getModelName(params);
    if (params.audio) {
      if (model === "gpt-4o") {
        model = "gpt-4o-audio-preview";
      } else if (model === "gpt-4o-mini") {
        model = "gpt-4o-mini-audio-preview";
      }
    }

    const messages = this.buildContentParts(params);

    // Build request options
    const requestOptions: any = {
      model,
      messages,
      stream: true,
      stream_options: {
        include_usage: true,
      },
    };

    // Add modalities if using audio - set to text only to avoid requiring audio output configuration
    if (params.audio) {
      requestOptions.modalities = ["text"];
    }

    // Add optional parameters if provided
    if (params.temperature !== undefined) {
      requestOptions.temperature = params.temperature;
    }

    if (params.maxTokens !== undefined) {
      requestOptions.max_tokens = params.maxTokens;
    }

    // Call the streaming API
    return await this.client!.chat.completions.create(requestOptions);
  }

  /**
   * Extract text from API response
   */
  protected extractTextFromResponse(response: any): string {
    return response.choices[0]?.message?.content || "";
  }

  /**
   * Extract metadata from API response
   */
  protected extractMetadataFromResponse(response: any, modelName: string): TokenMetadata {
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;

    return this.createTokenMetadata(modelName, inputTokens, outputTokens);
  }

  /**
   * Required implementation for BaseLLMProvider
   * Create a promise that resolves with metadata from a stream
   */
  protected createMetadataPromiseFromStream(streamResult: any, modelName: string): Promise<TokenMetadata> {
    return new Promise<TokenMetadata>((resolve) => {
      let usageData: any = null;

      // Process the stream to extract the final usage data chunk
      (async () => {
        try {
          const streamCopy = streamResult;
          for await (const chunk of streamCopy) {
            // The usage chunk has an empty choices array and usage data
            if (chunk.choices.length === 0 && chunk.usage) {
              usageData = chunk.usage;
              break;
            }
          }

          // After stream completes, resolve with the metadata
          if (usageData) {
            resolve(
              this.createTokenMetadata(modelName, usageData.prompt_tokens || 0, usageData.completion_tokens || 0)
            );
          } else {
            // Fallback if we somehow didn't get usage data
            resolve(this.createTokenMetadata(modelName, 0, 0));
          }
        } catch (error) {
          console.warn("Error extracting metadata from OpenAI stream:", error);
          resolve(this.createTokenMetadata(modelName, 0, 0));
        }
      })();
    });
  }

  /**
   * Required implementation for BaseLLMProvider
   * Extract text chunks from a stream
   */
  protected async *extractTextChunksFromStream(streamResult: any): AsyncIterable<string> {
    try {
      // Process OpenAI stream format
      for await (const chunk of streamResult) {
        // Skip the usage chunk (has empty choices array)
        if (chunk.choices.length === 0) {
          continue;
        }

        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error("Error processing OpenAI stream:", error);
    }
  }

  /**
   * Override the generateStream method to properly handle OpenAI stream
   * with usage metadata
   */
  public generateStream(params: BaseGenerateParams) {
    const modelName = this.getModelName(params);

    return {
      stream: this.createTextStream(params),
      getMetadata: async () => {
        const streamingResponse = await this.makeStreamingRequest(params);

        // Process the stream to extract the final usage data chunk
        let usageData: any = null;

        try {
          for await (const chunk of streamingResponse) {
            // The usage chunk has an empty choices array and usage data
            if (chunk.choices.length === 0 && chunk.usage) {
              usageData = chunk.usage;
              break;
            }
          }

          if (usageData) {
            return this.createTokenMetadata(modelName, usageData.prompt_tokens || 0, usageData.completion_tokens || 0);
          }
        } catch (error) {
          console.warn("Error extracting metadata from OpenAI stream:", error);
        }

        // Fallback if we somehow didn't get usage data
        return this.createTokenMetadata(modelName, 0, 0);
      },
    };
  }

  /**
   * Create a text stream from the streaming response
   */
  private async *createTextStream(params: BaseGenerateParams): AsyncIterable<string> {
    const streamingResponse = await this.makeStreamingRequest(params);

    try {
      // Process OpenAI stream format
      for await (const chunk of streamingResponse) {
        // Skip the usage chunk (has empty choices array)
        if (chunk.choices.length === 0) {
          continue;
        }

        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error("Error processing OpenAI stream:", error);
    }
  }
}
