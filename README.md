# LLM Factory

LLM Factory is a TypeScript library that provides a unified interface for interacting with different Large Language Model (LLM) providers, such as Google Gemini, Anthropic Claude, and OpenAI GPT.

## Key Features

- 🔄 **Unified Interface**: Consistent API to interact with different LLMs
- 🌊 **Streaming Support**: Real-time text generation for interactive experiences
- 📷 **Multimodal Processing**: Support for text, image, and audio inputs
- 📊 **Metrics and Cost**: Token tracking and cost estimates with support for tiered pricing models
- 🧵 **Thread-Safe**: Designed to handle multiple concurrent requests
- 🧩 **Extensible**: Easy to add new LLM providers

## Tiered Pricing Support

LLM Factory provides support for tiered pricing models used by some LLM providers. This allows accurate cost estimation for models like Gemini 2.5 Pro which have different rates based on token thresholds:

- **Standard Pricing**: Fixed rate per million tokens for input and output
- **Tiered Pricing**: Different rates based on token volume thresholds

For example, Gemini 2.5 Pro uses the following tiered pricing structure:
```
Input tokens:
- $1.25 per million tokens (≤ 200K tokens)
- $2.50 per million tokens (> 200K tokens)

Output tokens:
- $10.00 per million tokens (≤ 200K tokens)
- $15.00 per million tokens (> 200K tokens)
```

The cost calculator automatically handles tiered pricing, ensuring accurate cost estimates across all supported models and usage levels.

## Installation

```bash
npm install llm-factory
# or
yarn add llm-factory
# or
pnpm add llm-factory
```

## Environment Setup

Create a `.env` file in your project root:

```env
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## Simplified API with LLMFactory

The main advantage of LLM Factory is its unified interface through the `LLMFactory` class, which automatically handles provider selection based on the model:

```typescript
import { LLMFactory } from 'llm-factory';

// Initialize the factory with all providers at once
const llmFactory = new LLMFactory({
  openaiApiKey: process.env.OPENAI_API_KEY,
  googleApiKey: process.env.GEMINI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

// Now you can use any model without worrying about the underlying provider
async function generateWithAnyModel() {
  // Using OpenAI
  const openaiResponse = await llmFactory.generate({
    model: "gpt-4o-mini",
    prompt: "Explain how transformers work in 2 sentences",
    temperature: 0.7,
  });
  
  // Using Google Gemini
  const geminiResponse = await llmFactory.generate({
    model: "gemini-2.0-flash",
    prompt: "What are the key AI trends for 2024?",
    temperature: 0.7,
  });
  
  // Using Anthropic Claude
  const claudeResponse = await llmFactory.generate({
    model: "claude-3-5-haiku-latest",
    prompt: "Write a short poem about AI",
    temperature: 0.9,
  });
  
  console.log("OpenAI response:", openaiResponse.text);
  console.log("Gemini response:", geminiResponse.text);
  console.log("Claude response:", claudeResponse.text);
}

// Streaming with any model is just as easy
async function streamWithAnyModel(model: string, prompt: string) {
  const { stream, getMetadata } = llmFactory.generateStream({
    model,
    prompt,
    temperature: 0.7,
  });
  
  // Consume the stream
  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }
  
  // Get metadata after streaming is complete
  const metadata = await getMetadata();
  console.log("\nCost:", metadata.cost);
}

// Check if a model is available before using it
if (llmFactory.isModelAvailable("gpt-4o")) {
  console.log("GPT-4o is available for use");
}

// Use callbacks with any model
function generateWithCallbacks(model: string, prompt: string) {
  llmFactory.generateWithCallbacks({
    model,
    prompt,
    temperature: 0.7,
    onChunk: (chunk) => {
      process.stdout.write(chunk);
    },
    onComplete: (response) => {
      console.log("\nTotal tokens:", response.metadata.inputTokens + response.metadata.outputTokens);
      console.log("Cost:", response.metadata.cost);
    },
    onError: (error) => {
      console.error("Generation error:", error);
    },
  });
}

// For web applications, get a standard ReadableStream
async function getWebStream(model: string, prompt: string) {
  const { stream } = llmFactory.generateReadableStream({
    model,
    prompt,
    temperature: 0.7,
  });
  
  // Use with Response for Server-Sent Events
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## Direct Provider Usage

If you prefer to work with specific providers directly, you can also use them individually:

### Basic Text Generation

```typescript
import { GoogleProvider, OpenAIProvider, AnthropicProvider } from 'llm-factory';

// Choose one provider to use
const provider = new GoogleProvider();
// const provider = new OpenAIProvider();
// const provider = new AnthropicProvider();

// Generate text using the selected provider
async function generateText() {
  const response = await provider.generate({
    model: "gemini-2.0-flash-lite", // Use the appropriate model for your chosen provider
    prompt: "Explain the concept of LLMs in simple terms",
    temperature: 0.7,
    maxTokens: 100,
  });
  
  console.log(response.text);
  console.log("Input tokens:", response.metadata.inputTokens);
  console.log("Output tokens:", response.metadata.outputTokens);
  console.log("Estimated cost:", response.metadata.cost);
}

// Or use each provider for different purposes
async function useMultipleProviders() {
  const openaiProvider = new OpenAIProvider();
  const geminiProvider = new GoogleProvider();
  const claudeProvider = new AnthropicProvider();
  
  // Use OpenAI for creative tasks
  const storyResponse = await openaiProvider.generate({
    model: "gpt-4o-mini",
    prompt: "Write a short sci-fi story",
    temperature: 0.9,
  });
  
  // Use Gemini for image analysis
  const imageResponse = await geminiProvider.generate({
    model: "gemini-2.0-flash",
    prompt: "Describe what's in this image",
    image: imageBase64, // Base64-encoded image
    temperature: 0.2,
  });
  
  // Use Claude for factual responses
  const factResponse = await claudeProvider.generate({
    model: "claude-3-5-haiku-latest",
    prompt: "Explain quantum computing principles",
    temperature: 0.1,
  });
}
```

### Text Streaming

```typescript
import { GoogleProvider } from 'llm-factory';

const provider = new GoogleProvider();

async function streamText() {
  const { stream, getMetadata } = provider.generateStream({
    model: "gemini-2.0-flash-lite",
    prompt: "Write a short story about AI",
    temperature: 0.9,
    maxTokens: 500,
  });
  
  // Consume the text stream
  for await (const chunk of stream) {
    process.stdout.write(chunk); // or add to UI in real-time
  }
  
  // Retrieve metadata after the stream completes
  const metadata = await getMetadata();
  console.log("\nMetadata:", metadata);
}
```

### Generation with Callbacks

```typescript
import { AnthropicProvider } from 'llm-factory';

const provider = new AnthropicProvider();

function generateWithCallbacks() {
  provider.generateWithCallbacks({
    model: "claude-3-5-haiku-latest",
    prompt: "What are the AI trends for 2024?",
    maxTokens: 200,
    onChunk: (chunk) => {
      process.stdout.write(chunk);
    },
    onComplete: (response) => {
      console.log("\nComplete response:", response);
    },
    onError: (error) => {
      console.error("Generation error:", error);
    }
  });
}
```

### Image Processing (OCR)

```typescript
import fs from 'fs';
import { GoogleProvider } from 'llm-factory';

const provider = new GoogleProvider();

async function processImage() {
  // Load an image as base64
  const imageBase64 = fs.readFileSync('path/to/image.jpg', { encoding: 'base64' });
  
  const response = await provider.generate({
    model: "gemini-2.0-flash-lite",
    prompt: "Extract all visible text in this image",
    image: imageBase64,
    temperature: 0.2,
  });
  
  console.log("Extracted text:", response.text);
}
```

### ReadableStream for Web Environments

```typescript
import { OpenAIProvider } from 'llm-factory';

const provider = new OpenAIProvider();

async function getReadableStream() {
  const { stream, getMetadata } = provider.generateReadableStream({
    model: "gpt-4o-mini",
    prompt: "Explain quantum computing",
    temperature: 0.3,
  });
  
  // Use with fetch Response or HTML SSE
  return new Response(stream);
  
  // Or consume manually
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(value); // chunk of text
  }
}
```

## API Reference

The library provides a consistent API across all providers:

### Common Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| model | string | The model to use (provider-specific) |
| prompt | string | The input text prompt |
| temperature | number | Controls randomness (0.0-1.0) |
| maxTokens | number | Maximum tokens to generate |
| image | string \| string[] | Base64-encoded image(s) |
| audio | string \| string[] | Base64-encoded audio file(s) |

### LLMFactory Methods

The LLMFactory provides the same methods as individual providers but with automatic provider selection:

```typescript
const llmFactory = new LLMFactory({
  openaiApiKey: '...',
  googleApiKey: '...',
  anthropicApiKey: '...',
});

// Check model availability
const isAvailable = llmFactory.isModelAvailable(modelName);

// Generate text
const response = await llmFactory.generate(params);

// Generate streaming text
const { stream, getMetadata } = llmFactory.generateStream(params);

// Generate with callbacks
llmFactory.generateWithCallbacks(params);

// Generate with web ReadableStream
const { stream, getMetadata } = llmFactory.generateReadableStream(params);
```

### Provider Methods

Each provider implements these core methods:

#### `generate(params)`

Synchronous text generation that returns a complete response.

```typescript
const response = await provider.generate({
  model: "model-name",
  prompt: "Your prompt",
  // other parameters
});

// Returns: { text: string, metadata: TokenMetadata }
```

#### `generateStream(params)`

Asynchronous text generation that returns a stream of text chunks and metadata.

```typescript
const { stream, getMetadata } = provider.generateStream({
  model: "model-name",
  prompt: "Your prompt",
  // other parameters
});

// stream: AsyncIterable<string>
// getMetadata: () => Promise<TokenMetadata>
```

#### `generateReadableStream(params)`

Similar to generateStream but returns a standard web ReadableStream.

```typescript
const { stream, getMetadata } = provider.generateReadableStream({
  model: "model-name",
  prompt: "Your prompt",
  // other parameters
});

// stream: ReadableStream<string>
// getMetadata: () => Promise<TokenMetadata>
```

#### `generateWithCallbacks(params)`

Event-based text generation with callbacks for chunks, completion, and errors.

```typescript
provider.generateWithCallbacks({
  model: "model-name",
  prompt: "Your prompt",
  // other parameters
  onChunk: (chunk: string) => void,
  onComplete: (response: LLMResponse) => void,
  onError: (error: any) => void,
});
```

## Architecture

The library is built around a common `LLMProviderInterface` that all providers implement:

- `LLMFactory`: Main entry point that automatically selects providers based on model names
- `BaseLLMProvider`: Abstract class with common implementations
  - `GoogleProvider`: Google Gemini implementation
  - `OpenAIProvider`: OpenAI GPT implementation
  - `AnthropicProvider`: Anthropic Claude implementation
  - (Other providers can be added following the same pattern)

## Supported Providers

| Provider | Supported Models | Features |
|----------|-------------------|----------|
| Google   | gemini-2.0-flash, gemini-2.0-pro, ... | Text, Images, Audio |
| OpenAI   | gpt-4o, gpt-4o-mini, gpt-3.5-turbo, ... | Text, Images |
| Anthropic | claude-3-7-sonnet, claude-3-5-haiku, ... | Text, Images |

## Extending with New Providers

To add a new provider, create a new class that extends `BaseLLMProvider` and implement the abstract methods:

```typescript
import { BaseLLMProvider, TokenMetadata } from 'llm-factory';

export class NewProvider extends BaseLLMProvider {
  protected DEFAULT_MODEL = "default-model-name";
  
  constructor(apiKey?: string) {
    super(apiKey);
    this.initClient();
  }
  
  protected initClient(): void {
    // Initialize the provider client
  }
  
  protected checkClientInitialized(): void {
    // Check if client is initialized
  }
  
  protected buildContentParts(params: BaseGenerateParams): any {
    // Process content (text, images, audio)
  }
  
  protected async makeGenerationRequest(params: BaseGenerateParams): Promise<any> {
    // Implement provider API call
  }
  
  protected async makeStreamingRequest(params: BaseGenerateParams): Promise<any> {
    // Implement provider streaming API call
  }
  
  protected extractTextFromResponse(response: any): string {
    // Extract text from API response
  }
  
  protected extractMetadataFromResponse(response: any, modelName: string): TokenMetadata {
    // Extract metadata from API response
  }
  
  protected async createMetadataPromiseFromStream(streamResult: any, modelName: string): Promise<TokenMetadata> {
    // Create a promise that resolves with metadata from the stream
  }
  
  protected extractTextChunksFromStream(streamResult: any): AsyncIterable<string> {
    // Extract text chunks from the stream
  }
}
```

## Contributions

Contributions are welcome! Feel free to open issues or pull requests.

## License

MIT 