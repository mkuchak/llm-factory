import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { beforeEach, describe, expect, it } from "vitest";
import { OpenAIProvider } from "../providers/openai";
import { LLMModel } from "../types/models";
import { BaseGenerateParams } from "../types/params";

// Load environment variables
dotenv.config();

// Skip tests if API key not available
const hasApiKey = !!process.env.OPENAI_API_KEY;
const skipTest = hasApiKey ? it : it.skip;

// Sample files
const IMAGE_SAMPLE_PATH = path.resolve(__dirname, "../../samples/image_sample.jpg");
const AUDIO_SAMPLE_PATH = path.resolve(__dirname, "../../samples/audio_sample.mp3");

describe("OpenAIProvider", () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider();
  });

  skipTest("should generate text correctly", async () => {
    const response = await provider.generate({
      model: "gpt-4.1-mini",
      prompt: "What are LLMs? Answer in just one sentence.",
      temperature: 0.7,
    });

    console.log("Generated text:", response.text);
    console.log("Metadata:", response.metadata);

    expect(response.text).toBeTruthy();
    expect(response.metadata).toBeDefined();
    expect(response.metadata.model).toBeTruthy();
    expect(response.metadata.inputTokens).toBeGreaterThan(0);
    expect(response.metadata.outputTokens).toBeGreaterThan(0);
    expect(response.metadata.cost).toBeGreaterThanOrEqual(0);
  });

  skipTest("should generate text with callbacks correctly", async () => {
    const chunks: string[] = [];
    let finalResponse: any;

    await provider.generateWithCallbacks({
      model: "gpt-4.1-mini",
      prompt: "What are LLMs? Answer in just one sentence.",
      temperature: 0.7,
      onChunk: (chunk) => {
        chunks.push(chunk);
      },
      onComplete: (response) => {
        finalResponse = response;
        console.log("Complete response received:", response);
      },
      onError: (error) => {
        console.error(error);
      },
    });

    console.log(`Joined chunks: ${chunks.join("")}`);
    console.log(`Received ${chunks.length} chunks`);

    expect(chunks.length).toBeGreaterThan(0);
    expect(finalResponse).toBeDefined();
    expect(finalResponse.text).toBeTruthy();
    expect(finalResponse.metadata).toBeDefined();
    expect(finalResponse.metadata.inputTokens).toBeGreaterThanOrEqual(0);
    expect(finalResponse.metadata.outputTokens).toBeGreaterThanOrEqual(0);
  });

  skipTest("should generate text stream with metadata correctly", async () => {
    const { stream, getMetadata } = provider.generateStream({
      model: "gpt-4.1-mini",
      prompt: "What are LLMs? Answer in just one sentence.",
      temperature: 0.7,
    });

    // Collect chunks
    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Get metadata after stream completes
    const metadata = await getMetadata();
    console.log("Stream metadata:", metadata);

    expect(chunks.length).toBeGreaterThan(0);
    expect(metadata).toBeDefined();
    expect(metadata.model).toBeTruthy();
    expect(metadata.inputTokens).toBeGreaterThanOrEqual(0);
    expect(metadata.outputTokens).toBeGreaterThanOrEqual(0);
  });

  skipTest("should generate readable stream correctly", async () => {
    const { stream: readableStream, getMetadata } = provider.generateReadableStream({
      model: "gpt-4.1-mini",
      prompt: "What are LLMs? Answer in just one sentence.",
      temperature: 0.7,
    });

    // Create a reader to consume the stream
    const reader = readableStream.getReader();
    const chunks: string[] = [];
    let fullText = "";

    // Process chunks until done
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        fullText += value;
      }
    } finally {
      reader.releaseLock();
    }

    // Get metadata after stream completes
    const metadata = await getMetadata();
    console.log(`ReadableStream full text: ${fullText.substring(0, 50)}...`);
    console.log(`ReadableStream received ${chunks.length} chunks`);
    console.log("ReadableStream metadata:", metadata);

    // Assertions
    expect(chunks.length).toBeGreaterThan(0);
    expect(fullText.length).toBeGreaterThan(0);
    expect(metadata).toBeDefined();
    expect(metadata.model).toBeTruthy();
    expect(metadata.inputTokens).toBeGreaterThan(0);
    expect(metadata.outputTokens).toBeGreaterThan(0);
    expect(metadata.cost).toBeGreaterThanOrEqual(0);
  });

  skipTest("should perform OCR on an image correctly", async () => {
    // Check if the sample file exists
    if (!fs.existsSync(IMAGE_SAMPLE_PATH)) {
      console.log(`Skipping test: OCR sample file not found at ${IMAGE_SAMPLE_PATH}`);
      return;
    }

    // Read the image file as base64
    const imageBase64 = fs.readFileSync(IMAGE_SAMPLE_PATH, { encoding: "base64" });

    // Generate response with image
    const response = await provider.generate({
      model: "gpt-4.1-mini",
      prompt: "Extract all text visible in this image. Format the text exactly as it appears.",
      image: imageBase64,
      temperature: 0.2,
    });

    console.log("OCR result:", `${response.text.substring(0, 300)}...`);
    console.log("OCR metadata:", response.metadata);

    // Assertions
    expect(response.text).toBeTruthy();
    expect(response.text.length).toBeGreaterThan(50); // Should extract substantial text
    expect(response.metadata).toBeDefined();
    expect(response.metadata.model).toBe("gpt-4.1-mini");
    expect(response.metadata.inputTokens).toBeGreaterThan(0);
    expect(response.metadata.outputTokens).toBeGreaterThan(0);
    expect(response.metadata.cost).toBeGreaterThan(0);
  });

  skipTest("should transcribe audio correctly", async () => {
    // Check if the sample file exists
    if (!fs.existsSync(AUDIO_SAMPLE_PATH)) {
      console.log(`Skipping test: Transcription sample file not found at ${AUDIO_SAMPLE_PATH}`);
      return;
    }

    // Read the audio file as base64
    const audioBase64 = fs.readFileSync(AUDIO_SAMPLE_PATH, { encoding: "base64" });

    // Generate response with audio
    const response = await provider.generate({
      model: "gpt-4.1-mini",
      prompt:
        "Transcribe the following audio file completely and accurately. Include any speaker identifications if possible.",
      audio: audioBase64,
      temperature: 0.2,
    });

    console.log("Transcription result:", `${response.text.substring(0, 300)}...`);
    console.log("Transcription metadata:", response.metadata);

    // Assertions
    expect(response.text).toBeTruthy();
    expect(response.text.length).toBeGreaterThan(50); // Should extract substantial text
    expect(response.metadata).toBeDefined();
    expect(response.metadata.model).toBe("gpt-4.1-mini");
    expect(response.metadata.inputTokens).toBeGreaterThan(0);
    expect(response.metadata.outputTokens).toBeGreaterThan(0);
    expect(response.metadata.cost).toBeGreaterThan(0);
  });
});
