import { AnthropicProvider, GoogleProvider, type LLMProviderInterface, OpenAIProvider } from "./providers";
import type { ReadableStreamWithMetadata, StreamWithMetadata } from "./providers/base";
import { MODEL_PROVIDER_MAP } from "./types/models";
import type { GenerateParams, GenerateWithCallbacksParams } from "./types/params";
import type { LLMResponse } from "./types/responses";

/**
 * LLMFactory configuration options
 */
export interface LLMFactoryConfig {
  openaiApiKey?: string;
  googleApiKey?: string;
  anthropicApiKey?: string;
}

/**
 * LLMFactory class for standardized interaction with different LLM providers
 */
export class LLMFactory {
  private providers: Map<string, LLMProviderInterface>;

  constructor(config: LLMFactoryConfig = {}) {
    this.providers = new Map();

    // Initialize providers with optional API keys
    this.initializeProviders(config);
  }

  /**
   * Initialize providers with API keys
   */
  private initializeProviders(config: LLMFactoryConfig): void {
    // Create provider instances but handle initialization errors gracefully
    try {
      this.providers.set("openai", new OpenAIProvider(config.openaiApiKey));
    } catch (error) {
      console.warn("Failed to initialize OpenAI provider:", error);
    }

    try {
      this.providers.set("google", new GoogleProvider(config.googleApiKey));
    } catch (error) {
      console.warn("Failed to initialize Google provider:", error);
    }

    try {
      this.providers.set("anthropic", new AnthropicProvider(config.anthropicApiKey));
    } catch (error) {
      console.warn("Failed to initialize Anthropic provider:", error);
    }
  }

  /**
   * Get the appropriate provider for a given model
   */
  private getProviderForModel(model: string): LLMProviderInterface {
    const providerName = MODEL_PROVIDER_MAP[model as keyof typeof MODEL_PROVIDER_MAP];

    if (!providerName) {
      throw new Error(`Unsupported model: ${model}`);
    }

    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider not initialized: ${providerName}`);
    }

    return provider;
  }

  /**
   * Check if a model is supported and its provider is available
   */
  isModelAvailable(model: string): boolean {
    try {
      const providerName = MODEL_PROVIDER_MAP[model as keyof typeof MODEL_PROVIDER_MAP];
      return Boolean(providerName && this.providers.get(providerName));
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate text from a prompt
   */
  async generate(params: GenerateParams): Promise<LLMResponse> {
    const provider = this.getProviderForModel(params.model);
    return provider.generate(params);
  }

  /**
   * Generate text with streaming via AsyncIterable
   */
  generateStream(params: GenerateParams): StreamWithMetadata {
    const provider = this.getProviderForModel(params.model);
    return provider.generateStream(params);
  }

  /**
   * Generate text with streaming via callbacks
   */
  generateWithCallbacks(params: GenerateWithCallbacksParams): void {
    const provider = this.getProviderForModel(params.model);
    provider.generateWithCallbacks(params);
  }

  /**
   * Generate text with streaming via ReadableStream
   */
  generateReadableStream(params: GenerateParams): ReadableStreamWithMetadata {
    const provider = this.getProviderForModel(params.model);
    return provider.generateReadableStream(params);
  }
}
