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
   * Generate text from a prompt with fallback and retry support
   */
  async generate(params: GenerateParams): Promise<LLMResponse> {
    const models = Array.isArray(params.model) ? params.model : [params.model];
    const maxRetries = params.retries ?? 3;
    
    let lastError: Error | null = null;
    
    // Try each model with retries
    for (const model of models) {
      const provider = this.getProviderForModel(model);
      
      // Attempt to generate with current model up to maxRetries times
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const result = await provider.generate({
            ...params,
            model, // Use the current model from the queue
          });
          
          // Ensure the response contains the actually used model (not the original)
          result.metadata.model = model;
          return result;
        } catch (error) {
          console.warn(`Generation failed with model ${model}, attempt ${attempt + 1}/${maxRetries}:`, error);
          lastError = error as Error;
          
          // If this was the last attempt with the current model, continue to next model
          if (attempt === maxRetries - 1) {
            console.warn(`All ${maxRetries} attempts failed for model ${model}, trying next model if available`);
          }
        }
      }
    }
    
    // If we got here, all models and retries have failed
    throw new Error(`All models failed after retries: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Generate text with streaming via AsyncIterable with fallback and retry support
   */
  generateStream(params: GenerateParams): StreamWithMetadata {
    const models = Array.isArray(params.model) ? params.model : [params.model];
    const maxRetries = params.retries ?? 3;
    
    let currentModelIndex = 0;
    let currentAttempt = 0;
    let lastError: Error | null = null;
    let streamController: ReadableStreamDefaultController<string> | null = null;
    let activeModel: string | null = null;
    
    // Create a custom AsyncIterable that will handle retries and model fallback
    const stream = new TransformStream<string, string>();
    const writer = stream.writable.getWriter();
    
    // Set up the async process to handle the generation
    const process = async () => {
      while (currentModelIndex < models.length) {
        const model = models[currentModelIndex];
        activeModel = model;
        
        try {
          const provider = this.getProviderForModel(model);
          const { stream: modelStream, getMetadata } = provider.generateStream({
            ...params,
            model,
          });
          
          // Process the stream from the current model
          for await (const chunk of modelStream) {
            writer.write(chunk);
          }
          
          // If we get here, the stream completed successfully
          writer.close();
          return { model, getMetadata };
        } catch (error) {
          console.warn(`Streaming failed with model ${model}, attempt ${currentAttempt + 1}/${maxRetries}:`, error);
          lastError = error as Error;
          
          currentAttempt++;
          
          // If we've tried this model enough times, move to the next one
          if (currentAttempt >= maxRetries) {
            currentModelIndex++;
            currentAttempt = 0;
          }
          
          // If we have no more models to try, fail
          if (currentModelIndex >= models.length) {
            const errorMessage = `All models failed after retries: ${lastError?.message || 'Unknown error'}`;
            writer.abort(new Error(errorMessage));
            throw new Error(errorMessage);
          }
        }
      }
      
      // If we get here without returning, all models have failed
      const errorMessage = `All models failed after retries: ${lastError?.message || 'Unknown error'}`;
      writer.abort(new Error(errorMessage));
      throw new Error(errorMessage);
    };
    
    // Start the process but don't await it
    const processingPromise = process();
    
    // Return a custom StreamWithMetadata
    return {
      stream: stream.readable,
      getMetadata: async () => {
        try {
          const result = await processingPromise;
          if (!result) {
            throw new Error("Failed to get metadata: stream processing ended without success");
          }
          const metadata = await result.getMetadata();
          // Update the model to the one that succeeded
          metadata.model = result.model;
          return metadata;
        } catch (error) {
          throw new Error(`Failed to get metadata: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };
  }

  /**
   * Generate text with streaming via callbacks with fallback and retry support
   */
  generateWithCallbacks(params: GenerateWithCallbacksParams): void {
    const { onChunk, onComplete, onError } = params;
    const models = Array.isArray(params.model) ? params.model : [params.model];
    const maxRetries = params.retries ?? 3;
    
    let currentModelIndex = 0;
    let currentAttempt = 0;
    let lastError: Error | null = null;
    let activeModel: string | null = null;
    let accumulator = "";
    
    // Function to try generation with the current model
    const tryGeneration = () => {
      if (currentModelIndex >= models.length) {
        // No more models to try
        const errorMessage = `All models failed after retries: ${lastError?.message || 'Unknown error'}`;
        if (onError) onError(new Error(errorMessage));
        return;
      }
      
      const model = models[currentModelIndex];
      activeModel = model;
      accumulator = ""; // Reset accumulator for new attempt
      
      try {
        const provider = this.getProviderForModel(model);
        
        provider.generateWithCallbacks({
          ...params,
          model,
          onChunk: (chunk) => {
            accumulator += chunk;
            onChunk(chunk);
          },
          onComplete: (response) => {
            if (onComplete) {
              // Update the model to the one that succeeded
              response.metadata.model = model;
              onComplete(response);
            }
          },
          onError: (error) => {
            console.warn(`Callback generation failed with model ${model}, attempt ${currentAttempt + 1}/${maxRetries}:`, error);
            lastError = error;
            
            currentAttempt++;
            
            // If we've tried this model enough times, move to the next one
            if (currentAttempt >= maxRetries) {
              currentModelIndex++;
              currentAttempt = 0;
            }
            
            // Try again with next model or attempt
            tryGeneration();
          }
        });
      } catch (error) {
        console.warn(`Setup failed for model ${model}, attempt ${currentAttempt + 1}/${maxRetries}:`, error);
        lastError = error as Error;
        
        currentAttempt++;
        
        // If we've tried this model enough times, move to the next one
        if (currentAttempt >= maxRetries) {
          currentModelIndex++;
          currentAttempt = 0;
        }
        
        // Try again with next model or attempt
        tryGeneration();
      }
    };
    
    // Start the generation process
    tryGeneration();
  }

  /**
   * Generate text with streaming via ReadableStream with fallback and retry support
   */
  generateReadableStream(params: GenerateParams): ReadableStreamWithMetadata {
    const models = Array.isArray(params.model) ? params.model : [params.model];
    const maxRetries = params.retries ?? 3;
    
    let currentModelIndex = 0;
    let currentAttempt = 0;
    let lastError: Error | null = null;
    let activeModel: string | null = null;
    
    // Store a reference to 'this' for use inside the ReadableStream
    const factory = this;
    
    // Define processingPromise outside of the ReadableStream scope
    let processingPromise: Promise<{ model: string, getMetadata: () => Promise<any> } | null>;
    
    // Create a custom ReadableStream that will handle retries and model fallback
    const stream = new ReadableStream<string>({
      start(controller) {
        // Function to try generation with the current model
        const tryGeneration = async () => {
          if (currentModelIndex >= models.length) {
            // No more models to try
            const errorMessage = `All models failed after retries: ${lastError?.message || 'Unknown error'}`;
            controller.error(new Error(errorMessage));
            return null;
          }
          
          const model = models[currentModelIndex];
          activeModel = model;
          
          try {
            const provider = factory.getProviderForModel(model);
            const { stream: modelStream, getMetadata } = provider.generateReadableStream({
              ...params,
              model,
            });
            
            // Set up a reader for the model's stream
            const reader = modelStream.getReader();
            
            // Process the stream from the current model
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            
            // If we get here, the stream completed successfully
            controller.close();
            return { model, getMetadata };
          } catch (error) {
            console.warn(`ReadableStream generation failed with model ${model}, attempt ${currentAttempt + 1}/${maxRetries}:`, error);
            lastError = error as Error;
            
            currentAttempt++;
            
            // If we've tried this model enough times, move to the next one
            if (currentAttempt >= maxRetries) {
              currentModelIndex++;
              currentAttempt = 0;
            }
            
            // Try again with next model or attempt
            return tryGeneration();
          }
        };
        
        // Start the generation process but don't block
        processingPromise = tryGeneration();
      }
    });
    
    // Return a custom ReadableStreamWithMetadata
    return {
      stream,
      getMetadata: async () => {
        try {
          const result = await processingPromise;
          if (!result) {
            throw new Error("Failed to get metadata: stream processing ended without success");
          }
          const metadata = await result.getMetadata();
          // Update the model to the one that succeeded
          metadata.model = result.model;
          return metadata;
        } catch (error) {
          throw new Error(`Failed to get metadata: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };
  }
}
