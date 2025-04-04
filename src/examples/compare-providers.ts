import dotenv from "dotenv";
import { GoogleProvider } from "../providers/google";
import { OpenAIProvider } from "../providers/openai";

// Load environment variables
dotenv.config();

/**
 * Compare responses between OpenAI and Google LLM providers
 */
async function compareProviders() {
  // Initialize providers
  const googleProvider = new GoogleProvider();
  const openaiProvider = new OpenAIProvider();

  // Common prompt to test with
  const prompt = "Explain the concept of LLM Factory in 100 words";

  console.log("🔄 Comparing provider responses for prompt:");
  console.log(`"${prompt}"\n`);

  // Test standard generation
  console.log("📊 STANDARD GENERATION:");

  console.log("\n🟢 Google Gemini response:");
  const googleResponse = await googleProvider.generate({
    model: "gemini-2.0-flash-lite",
    prompt,
    maxTokens: 200,
  });
  console.log(googleResponse.text);
  console.log("Metadata:", googleResponse.metadata);

  console.log("\n🔵 OpenAI GPT response:");
  const openaiResponse = await openaiProvider.generate({
    model: "gpt-4o-mini",
    prompt,
    maxTokens: 200,
  });
  console.log(openaiResponse.text);
  console.log("Metadata:", openaiResponse.metadata);

  // Test streaming
  console.log("\n\n📊 STREAMING GENERATION:");

  console.log("\n🟢 Google Gemini streaming:");
  let googleStreamText = "";
  const { stream: googleStream, getMetadata: getGoogleMetadata } = googleProvider.generateStream({
    model: "gemini-2.0-flash-lite",
    prompt,
    maxTokens: 200,
  });

  for await (const chunk of googleStream) {
    googleStreamText += chunk;
    process.stdout.write(chunk);
  }

  const googleStreamMetadata = await getGoogleMetadata();
  console.log("\nMetadata:", googleStreamMetadata);

  console.log("\n🔵 OpenAI GPT streaming:");
  let openaiStreamText = "";
  const { stream: openaiStream, getMetadata: getOpenaiMetadata } = openaiProvider.generateStream({
    model: "gpt-4o-mini",
    prompt,
    maxTokens: 200,
  });

  for await (const chunk of openaiStream) {
    openaiStreamText += chunk;
    process.stdout.write(chunk);
  }

  const openaiStreamMetadata = await getOpenaiMetadata();
  console.log("\nMetadata:", openaiStreamMetadata);

  // Calculate total tokens
  const totalGoogleTokens =
    googleResponse.metadata.inputTokens +
    googleResponse.metadata.outputTokens +
    (googleStreamMetadata.inputTokens + googleStreamMetadata.outputTokens);

  const totalOpenAITokens =
    openaiResponse.metadata.inputTokens +
    openaiResponse.metadata.outputTokens +
    (openaiStreamMetadata.inputTokens + openaiStreamMetadata.outputTokens);

  console.log("\n\n📝 SUMMARY:");
  console.log(`Google Gemini total tokens: ${totalGoogleTokens}`);
  console.log(`OpenAI GPT total tokens: ${totalOpenAITokens}`);
  console.log(`Google Gemini total cost: $${googleResponse.metadata.cost + googleStreamMetadata.cost}`);
  console.log(`OpenAI GPT total cost: $${openaiResponse.metadata.cost + openaiStreamMetadata.cost}`);
}

// Run the comparison
compareProviders().catch((error) => {
  console.error("Error in provider comparison:", error);
});
