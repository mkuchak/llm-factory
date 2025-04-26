import dotenv from "dotenv";
import { describe, expect, it } from "vitest";
import { LLMFactory } from "../llm-factory";
import { z } from "zod";

// Load environment variables
dotenv.config();

// Skip tests if API keys not available
const hasGoogleApiKey = !!process.env.GEMINI_API_KEY;
const hasOpenAIApiKey = !!process.env.OPENAI_API_KEY;
const hasAnthropicApiKey = !!process.env.ANTHROPIC_API_KEY;
const skipGoogleTest = hasGoogleApiKey ? it : it.skip;
const skipOpenAITest = hasOpenAIApiKey ? it : it.skip;
const skipAnthropicTest = hasAnthropicApiKey ? it : it.skip;

describe("Structured Output", () => {
  // Create a factory instance once for all tests
  const factory = new LLMFactory();

  // Define a common test schema to use with all providers
  const productSchema = z.object({
    name: z.string().describe("Product name"),
    price: z.number().describe("Product price in USD"),
    description: z.string().describe("Product description"),
    features: z.array(z.string()).describe("List of product features"),
    inStock: z.boolean().describe("Whether the product is in stock"),
  });

  // Define another schema for testing different methods
  const recipeSchema = z.object({
    title: z.string().describe("Recipe title"),
    preparationTime: z.number().describe("Preparation time in minutes"),
    cookingTime: z.number().describe("Cooking time in minutes"),
    servings: z.number().describe("Number of servings"),
    difficulty: z.enum(["easy", "medium", "hard"]).describe("Recipe difficulty level"),
    ingredients: z.array(z.string()).describe("List of ingredients with quantities"),
    instructions: z.array(z.string()).describe("Step-by-step cooking instructions"),
    isVegetarian: z.boolean().describe("Whether the recipe is vegetarian"),
  });

  // Define a schema for testing event/meeting data
  const eventSchema = z.object({
    name: z.string().describe("Event name"),
    date: z.string().describe("Event date (YYYY-MM-DD format)"),
    time: z.string().describe("Event time"),
    location: z.string().describe("Event location"),
    description: z.string().describe("Brief description of the event"),
    attendees: z.array(z.string()).describe("List of attendees"),
    isVirtual: z.boolean().describe("Whether the event is virtual"),
    organizer: z.string().describe("Name of the event organizer"),
  });

  skipGoogleTest("should generate structured output with Google/Gemini", async () => {
    const response = await factory.generate({
      model: "gemini-2.0-flash",
      prompt: "Create product information for a new high-end smartphone",
      outputSchema: productSchema,
    });

    console.log("Google structured output:", response.text);
    console.log("Google metadata:", response.metadata);

    // Parse and validate the response
    const parsedResponse = JSON.parse(response.text);

    // Validate basic structure
    expect(parsedResponse).toHaveProperty("name");
    expect(parsedResponse).toHaveProperty("price");
    expect(parsedResponse).toHaveProperty("description");
    expect(parsedResponse).toHaveProperty("features");
    expect(parsedResponse).toHaveProperty("inStock");

    // Validate types
    expect(typeof parsedResponse.name).toBe("string");
    expect(typeof parsedResponse.price).toBe("number");
    expect(typeof parsedResponse.description).toBe("string");
    expect(Array.isArray(parsedResponse.features)).toBe(true);
    expect(typeof parsedResponse.inStock).toBe("boolean");

    // Validate content
    expect(parsedResponse.name.length).toBeGreaterThan(0);
    expect(parsedResponse.price).toBeGreaterThan(0);
    expect(parsedResponse.description.length).toBeGreaterThan(10);
    expect(parsedResponse.features.length).toBeGreaterThan(0);

    // Validate against schema
    const validatedResponse = productSchema.parse(parsedResponse);
    expect(validatedResponse).toBeDefined();

    // Validate token metadata
    expect(response.metadata).toBeDefined();
    expect(response.metadata.model).toBeTruthy();
    expect(response.metadata.inputTokens).toBeGreaterThan(0);
    expect(response.metadata.outputTokens).toBeGreaterThan(0);
    expect(response.metadata.cost).toBeGreaterThanOrEqual(0);
  });

  skipOpenAITest("should generate structured output with OpenAI", async () => {
    const response = await factory.generate({
      model: "gpt-4o-mini",
      prompt: "Create product information for a new high-end smartphone",
      outputSchema: productSchema,
    });

    console.log("OpenAI structured output:", response.text);
    console.log("OpenAI metadata:", response.metadata);

    // Parse and validate the response
    const parsedResponse = JSON.parse(response.text);

    // Validate basic structure
    expect(parsedResponse).toHaveProperty("name");
    expect(parsedResponse).toHaveProperty("price");
    expect(parsedResponse).toHaveProperty("description");
    expect(parsedResponse).toHaveProperty("features");
    expect(parsedResponse).toHaveProperty("inStock");

    // Validate types
    expect(typeof parsedResponse.name).toBe("string");
    expect(typeof parsedResponse.price).toBe("number");
    expect(typeof parsedResponse.description).toBe("string");
    expect(Array.isArray(parsedResponse.features)).toBe(true);
    expect(typeof parsedResponse.inStock).toBe("boolean");

    // Validate content
    expect(parsedResponse.name.length).toBeGreaterThan(0);
    expect(parsedResponse.price).toBeGreaterThan(0);
    expect(parsedResponse.description.length).toBeGreaterThan(10);
    expect(parsedResponse.features.length).toBeGreaterThan(0);

    // Validate against schema
    const validatedResponse = productSchema.parse(parsedResponse);
    expect(validatedResponse).toBeDefined();

    // Validate token metadata
    expect(response.metadata).toBeDefined();
    expect(response.metadata.model).toBeTruthy();
    expect(response.metadata.inputTokens).toBeGreaterThan(0);
    expect(response.metadata.outputTokens).toBeGreaterThan(0);
    expect(response.metadata.cost).toBeGreaterThanOrEqual(0);
  });

  skipAnthropicTest("should generate structured output with Anthropic", async () => {
    const response = await factory.generate({
      model: "claude-3-5-haiku-latest",
      prompt: "Create product information for a new high-end smartphone",
      outputSchema: productSchema,
    });

    console.log("Anthropic structured output:", response.text);
    console.log("Anthropic metadata:", response.metadata);

    // Parse and validate the response
    const parsedResponse = JSON.parse(response.text);

    // Validate basic structure
    expect(parsedResponse).toHaveProperty("name");
    expect(parsedResponse).toHaveProperty("price");
    expect(parsedResponse).toHaveProperty("description");
    expect(parsedResponse).toHaveProperty("features");
    expect(parsedResponse).toHaveProperty("inStock");

    // Validate types
    expect(typeof parsedResponse.name).toBe("string");
    expect(typeof parsedResponse.price).toBe("number");
    expect(typeof parsedResponse.description).toBe("string");
    expect(Array.isArray(parsedResponse.features)).toBe(true);
    expect(typeof parsedResponse.inStock).toBe("boolean");

    // Validate content
    expect(parsedResponse.name.length).toBeGreaterThan(0);
    expect(parsedResponse.price).toBeGreaterThan(0);
    expect(parsedResponse.description.length).toBeGreaterThan(10);
    expect(parsedResponse.features.length).toBeGreaterThan(0);

    // Validate against schema
    const validatedResponse = productSchema.parse(parsedResponse);
    expect(validatedResponse).toBeDefined();

    // Validate token metadata
    expect(response.metadata).toBeDefined();
    expect(response.metadata.model).toBeTruthy();
    expect(response.metadata.inputTokens).toBeGreaterThan(0);
    expect(response.metadata.outputTokens).toBeGreaterThan(0);
    expect(response.metadata.cost).toBeGreaterThanOrEqual(0);
  });

  // ADDITIONAL TESTS USING DIFFERENT METHODS

  skipGoogleTest("should generate structured output with Google/Gemini using generateWithCallbacks", async () => {
    // Initialize test control variables
    let receivedChunk = false;
    let receivedComplete = false;
    let errorOccurred = false;
    let responseJson: any = null;
    let responseMetadata: any = null;

    // Use the factory with callbacks
    await new Promise<void>((resolve) => {
      factory.generateWithCallbacks({
        model: "gemini-2.0-flash",
        prompt: "Create a recipe for a delicious pasta dish",
        outputSchema: recipeSchema,
        onChunk: (chunk) => {
          // Should receive at least one chunk
          receivedChunk = true;
          try {
            // Try to parse the chunk as JSON (may or may not be complete)
            JSON.parse(chunk);
          } catch (e) {
            // If parsing fails, that's okay - might be a partial chunk
          }
        },
        onComplete: (response) => {
          receivedComplete = true;
          responseJson = JSON.parse(response.text);
          responseMetadata = response.metadata;
          resolve();
        },
        onError: (error) => {
          errorOccurred = true;
          console.error("Error:", error);
          resolve();
        },
      });
    });

    // Validate the callbacks fired properly
    expect(errorOccurred).toBe(false);
    expect(receivedChunk).toBe(true);
    expect(receivedComplete).toBe(true);

    // Validate the response structure
    expect(responseJson).not.toBeNull();
    expect(responseJson).toHaveProperty("title");
    expect(responseJson).toHaveProperty("preparationTime");
    expect(responseJson).toHaveProperty("cookingTime");
    expect(responseJson).toHaveProperty("servings");
    expect(responseJson).toHaveProperty("difficulty");
    expect(responseJson).toHaveProperty("ingredients");
    expect(responseJson).toHaveProperty("instructions");
    expect(responseJson).toHaveProperty("isVegetarian");

    // Validate types
    expect(typeof responseJson.title).toBe("string");
    expect(typeof responseJson.preparationTime).toBe("number");
    expect(typeof responseJson.cookingTime).toBe("number");
    expect(typeof responseJson.servings).toBe("number");
    expect(["easy", "medium", "hard"]).toContain(responseJson.difficulty);
    expect(Array.isArray(responseJson.ingredients)).toBe(true);
    expect(Array.isArray(responseJson.instructions)).toBe(true);
    expect(typeof responseJson.isVegetarian).toBe("boolean");

    // Validate content
    expect(responseJson.title.length).toBeGreaterThan(0);
    expect(responseJson.preparationTime).toBeGreaterThan(0);
    expect(responseJson.cookingTime).toBeGreaterThan(0);
    expect(responseJson.ingredients.length).toBeGreaterThan(0);
    expect(responseJson.instructions.length).toBeGreaterThan(0);

    // Validate metadata
    expect(responseMetadata).toBeDefined();
    expect(responseMetadata.model).toBeTruthy();
    expect(responseMetadata.inputTokens).toBeGreaterThan(0);
    expect(responseMetadata.outputTokens).toBeGreaterThan(0);
    expect(responseMetadata.cost).toBeGreaterThanOrEqual(0);
  });

  skipOpenAITest("should generate structured output with OpenAI using generateStream", async () => {
    // Use the factory's streaming interface
    const { stream, getMetadata } = factory.generateStream({
      model: "gpt-4o-mini",
      prompt: "Create a detailed recipe for chocolate chip cookies",
      outputSchema: recipeSchema,
    });

    // Collect all chunks
    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Get the metadata after streaming
    const metadata = await getMetadata();

    // Combine chunks and parse as JSON
    let fullResponse = "";
    if (chunks.length === 1) {
      // Often with structured output, we get the entire JSON in one chunk
      fullResponse = chunks[0];
    } else {
      // But we might get it in multiple chunks
      fullResponse = chunks.join("");
    }

    // Parse the JSON response
    const responseJson = JSON.parse(fullResponse);

    // Validate the response structure
    expect(responseJson).toHaveProperty("title");
    expect(responseJson).toHaveProperty("preparationTime");
    expect(responseJson).toHaveProperty("cookingTime");
    expect(responseJson).toHaveProperty("servings");
    expect(responseJson).toHaveProperty("difficulty");
    expect(responseJson).toHaveProperty("ingredients");
    expect(responseJson).toHaveProperty("instructions");
    expect(responseJson).toHaveProperty("isVegetarian");

    // Validate types
    expect(typeof responseJson.title).toBe("string");
    expect(typeof responseJson.preparationTime).toBe("number");
    expect(typeof responseJson.cookingTime).toBe("number");
    expect(typeof responseJson.servings).toBe("number");
    expect(["easy", "medium", "hard"]).toContain(responseJson.difficulty);
    expect(Array.isArray(responseJson.ingredients)).toBe(true);
    expect(Array.isArray(responseJson.instructions)).toBe(true);
    expect(typeof responseJson.isVegetarian).toBe("boolean");

    // Validate content
    expect(responseJson.title.length).toBeGreaterThan(0);
    expect(responseJson.preparationTime).toBeGreaterThan(0);
    expect(responseJson.cookingTime).toBeGreaterThan(0);
    expect(responseJson.ingredients.length).toBeGreaterThan(0);
    expect(responseJson.instructions.length).toBeGreaterThan(0);

    // Validate schema
    const validatedResponse = recipeSchema.parse(responseJson);
    expect(validatedResponse).toBeDefined();

    // Validate metadata
    expect(metadata).toBeDefined();
    expect(metadata.model).toBeTruthy();
    expect(metadata.inputTokens).toBeGreaterThan(0);
    expect(metadata.outputTokens).toBeGreaterThan(0);
    expect(metadata.cost).toBeGreaterThanOrEqual(0);
  });

  skipAnthropicTest("should generate structured output with Anthropic using generateReadableStream", async () => {
    // Use the factory's ReadableStream interface
    const { stream, getMetadata } = factory.generateReadableStream({
      model: "claude-3-5-haiku-latest",
      prompt: "Create an event description for a technology conference",
      outputSchema: eventSchema,
    });

    // Read from the stream
    const reader = stream.getReader();
    const chunks: string[] = [];

    // Process chunks until done
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    // Get metadata after stream completes
    const metadata = await getMetadata();

    // Combine chunks (usually just one for structured output)
    const fullResponse = chunks.join("");

    // Parse the JSON response
    const responseJson = JSON.parse(fullResponse);

    // Validate the response structure
    expect(responseJson).toHaveProperty("name");
    expect(responseJson).toHaveProperty("date");
    expect(responseJson).toHaveProperty("time");
    expect(responseJson).toHaveProperty("location");
    expect(responseJson).toHaveProperty("description");
    expect(responseJson).toHaveProperty("attendees");
    expect(responseJson).toHaveProperty("isVirtual");
    expect(responseJson).toHaveProperty("organizer");

    // Validate types
    expect(typeof responseJson.name).toBe("string");
    expect(typeof responseJson.date).toBe("string");
    expect(typeof responseJson.time).toBe("string");
    expect(typeof responseJson.location).toBe("string");
    expect(typeof responseJson.description).toBe("string");
    expect(Array.isArray(responseJson.attendees)).toBe(true);
    expect(typeof responseJson.isVirtual).toBe("boolean");
    expect(typeof responseJson.organizer).toBe("string");

    // Validate content
    expect(responseJson.name.length).toBeGreaterThan(0);
    expect(responseJson.date.length).toBeGreaterThan(0);
    expect(responseJson.description.length).toBeGreaterThan(10);

    // Validate date format (YYYY-MM-DD)
    expect(responseJson.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Validate schema
    const validatedResponse = eventSchema.parse(responseJson);
    expect(validatedResponse).toBeDefined();

    // Validate metadata
    expect(metadata).toBeDefined();
    expect(metadata.model).toBeTruthy();
    expect(metadata.inputTokens).toBeGreaterThan(0);
    expect(metadata.outputTokens).toBeGreaterThan(0);
    expect(metadata.cost).toBeGreaterThanOrEqual(0);
  });
});
