import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { beforeEach, describe, expect, it } from "vitest";
import { GoogleProvider } from "../providers/google";
import { LLMModel } from "../types/models";
import { BaseGenerateParams } from "../types/params";

// Load environment variables
dotenv.config();

// Skip tests if API key not available
const hasApiKey = !!process.env.GEMINI_API_KEY;
const skipTest = hasApiKey ? it : it.skip;

// Sample files
const IMAGE_SAMPLE_PATH = path.resolve(__dirname, "../../samples/image_sample.jpg");
const AUDIO_SAMPLE_PATH = path.resolve(__dirname, "../../samples/audio_sample.mp3");

describe("GoogleProvider", () => {
  let provider: GoogleProvider;

  beforeEach(() => {
    provider = new GoogleProvider();
  });

  skipTest("should generate text correctly", async () => {
    const response = await provider.generate({
      model: "gemini-2.0-flash-lite",
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
      model: "gemini-2.0-flash-lite",
      prompt: "What are LLMs? Answer in just one sentence.",
      temperature: 0.7,
      onChunk: (chunk) => {
        chunks.push(chunk);
        console.log(`Chunk received: ${chunk.substring(0, 20)}${chunk.length > 20 ? "..." : ""}`);
      },
      onComplete: (response) => {
        finalResponse = response;
        console.log("Complete response received:", response);
      },
      onError: (error) => {
        console.error(error);
      },
    });

    console.log(`Received ${chunks.length} chunks`);
    expect(chunks.length).toBeGreaterThan(0);
    expect(finalResponse).toBeDefined();
    expect(finalResponse.text).toBeTruthy();
    expect(finalResponse.metadata).toBeDefined();
    expect(finalResponse.metadata.inputTokens).toBeGreaterThan(0);
    expect(finalResponse.metadata.outputTokens).toBeGreaterThan(0);
  });

  skipTest("should generate text stream with metadata correctly", async () => {
    const { stream, getMetadata } = provider.generateStream({
      model: "gemini-2.0-flash-lite",
      prompt: "What are LLMs? Answer in just one sentence.",
      temperature: 0.7,
    });

    // Collect chunks
    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
      console.log(`Stream chunk: ${chunk.substring(0, 20)}${chunk.length > 20 ? "..." : ""}`);
    }

    // Get metadata after stream completes
    const metadata = await getMetadata();
    console.log("Stream metadata:", metadata);

    expect(chunks.length).toBeGreaterThan(0);
    expect(metadata).toBeDefined();
    expect(metadata.model).toBeTruthy();
    expect(metadata.inputTokens).toBeGreaterThan(0);
    expect(metadata.outputTokens).toBeGreaterThan(0);
  });

  skipTest("should handle concurrent streaming correctly", async () => {
    // Create 3 concurrent streams
    const streamResponses = await Promise.all(
      [1, 2, 3].map(async (num) => {
        const { stream, getMetadata } = provider.generateStream({
          model: "gemini-2.0-flash-lite",
          prompt: `Tell me ${num} interesting facts about AI`,
          temperature: 0.7,
        });

        // Collect chunks
        const chunks: string[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }

        // Get metadata
        const metadata = await getMetadata();

        return {
          text: chunks.join(""),
          chunks,
          metadata,
        };
      })
    );

    // Log results
    streamResponses.forEach((resp, idx) => {
      console.log(`Stream ${idx + 1} received ${resp.chunks.length} chunks`);
      console.log(`Stream ${idx + 1} text starts with: ${resp.text.substring(0, 30)}...`);
      console.log(`Stream ${idx + 1} metadata:`, resp.metadata);
    });

    // Verify all streams completed successfully
    streamResponses.forEach((resp) => {
      expect(resp.chunks.length).toBeGreaterThan(0);
      expect(resp.text.length).toBeGreaterThan(0);
      expect(resp.metadata).toBeDefined();
      expect(resp.metadata.inputTokens).toBeGreaterThan(0);
      expect(resp.metadata.outputTokens).toBeGreaterThan(0);
    });
  });

  skipTest("should generate readable stream correctly", async () => {
    const { stream: readableStream, getMetadata } = provider.generateReadableStream({
      model: "gemini-2.0-flash-lite",
      prompt: "What is machine learning?",
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
        console.log(`ReadableStream chunk: ${value.substring(0, 20)}${value.length > 20 ? "..." : ""}`);
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
      model: "gemini-2.0-flash-lite",
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
    expect(response.metadata.model).toBe("gemini-2.0-flash-lite");
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
      model: "gemini-2.0-flash-lite",
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
    expect(response.metadata.model).toBe("gemini-2.0-flash-lite");
    expect(response.metadata.inputTokens).toBeGreaterThan(0);
    expect(response.metadata.outputTokens).toBeGreaterThan(0);
    expect(response.metadata.cost).toBeGreaterThan(0);
  });
});
