import { type GenerationConfig, GoogleGenerativeAI, ResponseSchema } from "@google/generative-ai";
import type { LLMModel } from "../types/models";
import type { BaseGenerateParams } from "../types/params";
import { BaseLLMProvider, type TokenMetadata } from "./base";
import { zodToGeminiSchema } from "../utils/schema-converter";

/**
 * Google (Gemini) Provider Implementation
 */
export class GoogleProvider extends BaseLLMProvider {
  private client: GoogleGenerativeAI | null = null;
  protected DEFAULT_MODEL: LLMModel = "gemini-2.0-flash";

  constructor(apiKey?: string) {
    super(apiKey);
    this.initClient();
  }

  /**
   * Initialize the Google client with API key
   */
  protected initClient(): void {
    try {
      this.client = new GoogleGenerativeAI(this.apiKey || process.env.GEMINI_API_KEY || "");
    } catch (error) {
      // Initialize client as null if API key is missing
      // Actual error will be thrown when trying to use the client
      console.warn("Google client initialization failed. API calls will error.");
    }
  }

  /**
   * Check if client is initialized and throw error if not
   */
  protected checkClientInitialized(): void {
    if (!this.client) {
      throw new Error("Google client not initialized - API key may be missing");
    }
  }

  /**
   * Get the Gemini model instance with appropriate configuration
   */
  private getModel(params: BaseGenerateParams) {
    this.checkClientInitialized();

    const model = this.getModelName(params);

    // Create generation config from parameters
    const generationConfig: GenerationConfig = {};

    if (params.temperature !== undefined) {
      generationConfig.temperature = params.temperature;
    }

    if (params.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = params.maxTokens;
    }

    // Add structured output configuration if outputSchema is provided
    if (params.outputSchema) {
      generationConfig.responseMimeType = "application/json";
      generationConfig.responseSchema = zodToGeminiSchema(params.outputSchema) as ResponseSchema;
    }

    return this.client!.getGenerativeModel({
      model,
      generationConfig,
    });
  }

  /**
   * Process content parts (text, images, audio)
   */
  protected buildContentParts(params: BaseGenerateParams): any[] {
    const parts = [];

    // Add the text prompt
    if (params.prompt) {
      parts.push({ text: params.prompt });
    }

    // Add images if provided
    if (params.image) {
      const images = Array.isArray(params.image) ? params.image : [params.image];
      for (const image of images) {
        parts.push({
          inlineData: {
            data: image,
            mimeType: "image/jpeg", // Assuming JPEG; could be made dynamic
          },
        });
      }
    }

    // Add audio if provided
    if (params.audio) {
      const audioFiles = Array.isArray(params.audio) ? params.audio : [params.audio];
      for (const audio of audioFiles) {
        parts.push({
          inlineData: {
            data: audio,
            mimeType: "audio/mp3", // Assuming MP3; could be made dynamic
          },
        });
      }
    }

    return parts;
  }

  /**
   * Make the actual API call to generate content
   */
  protected async makeGenerationRequest(params: BaseGenerateParams): Promise<any> {
    const model = this.getModel(params);
    const parts = this.buildContentParts(params);

    // Call the API and return the result
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    return result.response;
  }

  /**
   * Make the actual API call to generate streaming content
   */
  protected async makeStreamingRequest(params: BaseGenerateParams): Promise<any> {
    const model = this.getModel(params);
    const parts = this.buildContentParts(params);

    // Call the API with streaming
    return await model.generateContentStream({
      contents: [{ role: "user", parts }],
    });
  }

  /**
   * Extract text from API response
   */
  protected extractTextFromResponse(response: any): string {
    // Check if response is structured (JSON) based on mime type
    if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      try {
        // First check if already parsed
        if (typeof response.candidates[0].content.parts[0].text === 'object') {
          return JSON.stringify(response.candidates[0].content.parts[0].text);
        }
        // Try to parse as JSON if it's a string that looks like JSON
        const text = response.candidates[0].content.parts[0].text;
        if (typeof text === 'string' && (text.startsWith('{') || text.startsWith('['))) {
          return text;
        }
      } catch (e) {
        // If parsing fails, fall back to regular text handling
      }
    }

    // Get text content safely from the response
    return response.text ? (typeof response.text === "function" ? response.text() : response.text) : "";
  }

  /**
   * Extract metadata from API response
   */
  protected extractMetadataFromResponse(response: any, modelName: string): TokenMetadata {
    const usageMetadata = response.usageMetadata || {};
    const inputTokens = usageMetadata.promptTokenCount || 0;
    const outputTokens = usageMetadata.candidatesTokenCount || 0;

    return this.createTokenMetadata(modelName, inputTokens, outputTokens);
  }

  /**
   * Create a promise that resolves with metadata from a stream
   */
  protected createMetadataPromiseFromStream(streamResult: any, modelName: string): Promise<TokenMetadata> {
    return (async () => {
      try {
        // Wait for the stream to complete and get response
        const response = await streamResult.response;
        return this.extractMetadataFromResponse(response, modelName);
      } catch (error) {
        console.warn("Failed to get stream metadata:", error);
        return this.createTokenMetadata(modelName, 0, 0);
      }
    })();
  }

  /**
   * Extract text chunks from a stream
   */
  protected async *extractTextChunksFromStream(streamResult: any): AsyncIterable<string> {
    // Return only the text chunks
    for await (const chunk of streamResult.stream) {
      // Get text safely from chunk
      let chunkText = "";
      if (chunk.text) {
        chunkText = typeof chunk.text === "function" ? chunk.text() : chunk.text;
      }

      if (chunkText) {
        yield chunkText;
      }
    }
  }
}
