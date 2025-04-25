# LLM Factory

LLM Factory is a TypeScript library that provides a unified interface for interacting with different Large Language Model (LLM) providers, such as Google Gemini, Anthropic Claude, and OpenAI GPT.

## Key Features

- 🔄 **Unified Interface**: Consistent API to interact with different LLMs
- 🌊 **Streaming Support**: Real-time text generation for interactive experiences
- 📷 **Multimodal Processing**: Support for text, image, and audio inputs
- 📊 **Metrics and Cost**: Token tracking and cost estimates with support for tiered pricing models
- 🧵 **Thread-Safe**: Designed to handle multiple concurrent requests
- 🧩 **Extensible**: Easy to add new LLM providers

## Supported Models and Pricing Reference

LLM Factory supports the following models from different providers. The pricing information below is for reference only and may change based on the provider's pricing policies:

| Model | Input Cost ($/1M tokens) | Output Cost ($/1M tokens) | Provider |
|-------|-------------------------|--------------------------|----------|
| GPT-4.1 | $2.00 | $8.00 | OpenAI |
| GPT-4.1 Mini | $0.40 | $1.60 | OpenAI |
| GPT-4.1 Nano | $0.10 | $0.40 | OpenAI |
| GPT-4o | $2.50 | $10.00 | OpenAI |
| GPT-4o Mini | $0.15 | $0.60 | OpenAI |
| GPT-4o Audio Preview | $2.50 | $10.00 | OpenAI |
| GPT-4o Mini Audio Preview | $0.15 | $0.60 | OpenAI |
| Gemini 2.5 Pro Preview | Tiered* | Tiered* | Google |
| Gemini 2.5 Flash Preview | $0.15 | $0.60 | Google |
| Gemini 2.0 Flash | $0.10 | $0.40 | Google |
| Gemini 2.0 Flash Lite | $0.075 | $0.30 | Google |
| Claude 3.7 Sonnet | $3.00 | $15.00 | Anthropic |
| Claude 3.5 Sonnet | $3.00 | $15.00 | Anthropic |
| Claude 3.5 Haiku | $0.80 | $4.00 | Anthropic |

\* Gemini 2.5 Pro uses tiered pricing:
- Input: $1.25/1M tokens (≤200K), $2.50/1M tokens (>200K)
- Output: $10.00/1M tokens (≤200K), $15.00/1M tokens (>200K)

> **Note on Model Adaptation and Multimodal Support**: 
> - **OpenAI**: When using multimodal features (audio, images) with OpenAI models, LLM Factory automatically adapts the model selection. For example, if you specify `gpt-4o` and provide audio input, it will automatically use `gpt-4o-audio-preview`. Similarly, `gpt-4o-mini` will be adapted to `gpt-4o-mini-audio-preview` when audio is provided.
> - **Anthropic**: Currently, Anthropic's Claude models do not support audio processing capabilities.
> 
> This automatic adaptation ensures seamless multimodal support while maintaining a consistent API interface across providers.

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

## Usage

### Initialize the LLMFactory

```typescript
import { LLMFactory } from 'llm-factory';

// Initialize the factory with all providers at once
const llmFactory = new LLMFactory({
  openaiApiKey: process.env.OPENAI_API_KEY,
  googleApiKey: process.env.GEMINI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});
```

### Basic Text Generation

```typescript
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
```

### Model Availability Check

```typescript
// Check if a model is available before using it
if (llmFactory.isModelAvailable("gpt-4o")) {
  console.log("GPT-4o is available for use");
}
```

### Streaming Support

```typescript
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
```

### Callback-Based Generation

```typescript
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
```

### Web ReadableStream Support

```typescript
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

### Image Processing (OCR)

```typescript
import fs from 'fs';

async function processImage() {
  // Load an image as base64
  const imageBase64 = fs.readFileSync('path/to/image.jpg', { encoding: 'base64' });
  
  const response = await llmFactory.generate({
    model: "gemini-2.0-flash-lite", // Gemini models work well with images
    prompt: "Extract all visible text in this image",
    image: imageBase64,
    temperature: 0.2,
  });
  
  console.log("Extracted text:", response.text);
}
```

### Multimodal Use Cases

```typescript
// Using specific providers for different purposes
async function useMultimodalCapabilities() {
  // Creative tasks with OpenAI
  const storyResponse = await llmFactory.generate({
    model: "gpt-4o-mini",
    prompt: "Write a short sci-fi story",
    temperature: 0.9,
  });
  
  // Image analysis with Gemini
  const imageResponse = await llmFactory.generate({
    model: "gemini-2.0-flash", // Gemini is optimized for image understanding
    prompt: "Describe what's in this image",
    image: imageBase64, // Base64-encoded image
    temperature: 0.2,
  });
  
  // Factual responses with Claude
  const factResponse = await llmFactory.generate({
    model: "claude-3-5-haiku-latest", // Claude models are strong on factual responses
    prompt: "Explain quantum computing principles",
    temperature: 0.1,
  });
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

The LLMFactory provides these core methods with automatic provider selection:

- `isModelAvailable(modelName)`: Check if a model is available
- `generate(params)`: Synchronous text generation
- `generateStream(params)`: Asynchronous streaming text generation
- `generateWithCallbacks(params)`: Generation with callback functions
- `generateReadableStream(params)`: Generate with web ReadableStream

### Response Types

#### `generate(params)`

Synchronous text generation that returns a complete response.

```typescript
const response = await llmFactory.generate({
  model: "model-name",
  prompt: "Your prompt",
  // other parameters
});

// Returns: { text: string, metadata: TokenMetadata }
```

#### `generateStream(params)`

Asynchronous text generation that returns a stream of text chunks and metadata.

```typescript
const { stream, getMetadata } = llmFactory.generateStream({
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
const { stream, getMetadata } = llmFactory.generateReadableStream({
  model: "model-name",
  prompt: "Your prompt",
  // other parameters
});

// stream: ReadableStream<string>
// getMetadata: () => Promise<TokenMetadata>
```