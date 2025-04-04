import { LLMFactory } from "../index";

/**
 * Example of basic usage of LLMFactory
 */
async function basicExample() {
  // Initialize the LLMFactory with optional API keys
  // If not provided, it will use environment variables
  const llmFactory = new LLMFactory({
    // Uncomment and add your API keys if not using environment variables
    // openaiApiKey: "your-openai-api-key",
    // googleApiKey: "your-google-api-key",
    // anthropicApiKey: "your-anthropic-api-key",
  });

  // Check which models are available (based on API keys)
  const openaiModelAvailable = llmFactory.isModelAvailable("gpt-4o");
  const googleModelAvailable = llmFactory.isModelAvailable("gemini-2.0-flash");
  const anthropicModelAvailable = llmFactory.isModelAvailable("claude-3-7-sonnet-latest");

  console.log("Available models:");
  console.log("- OpenAI models:", openaiModelAvailable ? "available" : "not available");
  console.log("- Google models:", googleModelAvailable ? "available" : "not available");
  console.log("- Anthropic models:", anthropicModelAvailable ? "available" : "not available");
  console.log("\nNote: Models show as 'not available' if their API keys are missing.");

  try {
    // Example 1: Simple text generation
    console.log("\nExample 1: This would call OpenAI's API with your API key");
    console.log("Skipping actual API call since this is just a demonstration");

    /*
    const response = await llmFactory.generate({
      model: "gpt-4o", // or "gemini-2.0-flash" or "claude-3-7-sonnet-latest"
      prompt: "Explain quantum computing in simple terms",
      temperature: 0.7,
      maxTokens: 200,
    });

    console.log("Generated text:", response.text);
    console.log("Metadata:", response.metadata);
    */

    // Example 2: Streaming with callbacks
    console.log("\nExample 2: This would stream responses from Google's API");
    console.log("Skipping actual API call since this is just a demonstration");

    /*
    llmFactory.generateWithCallbacks({
      model: "gemini-2.0-flash",
      prompt: "Write a short poem about technology",
      temperature: 0.9,
      callbacks: {
        onChunk: (chunk) => console.log("Received chunk:", chunk),
        onComplete: () => console.log("Generation completed"),
        onError: (error) => console.error("Error:", error),
      },
    });
    */

    // Example 3: Using AsyncIterable stream
    console.log("\nExample 3: This would stream responses from Anthropic's API");
    console.log("Skipping actual API call since this is just a demonstration");

    /*
    const stream = llmFactory.generateStream({
      model: "claude-3-7-sonnet-latest",
      prompt: "List 5 benefits of AI",
      temperature: 0.5,
    });

    console.log("Streaming response:");
    for await (const chunk of stream) {
      process.stdout.write(chunk);
    }
    process.stdout.write("\n");
    */

    console.log("\nLLMFactory is working! API calls are commented out for demonstration purposes.");
    console.log("To use actual API calls, uncomment the code and provide valid API keys.");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example
basicExample();
