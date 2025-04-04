import type { LLMModel } from "./models";
import type { StreamCallback, StreamCompleteCallback, StreamErrorCallback } from "./responses";

/**
 * Base parameters for all generation methods
 */
export interface BaseGenerateParams {
  model: LLMModel;
  prompt: string;
  image?: string | string[]; // base64 encoded images
  audio?: string | string[]; // base64 encoded audio (assumed to be mp3 format)
  temperature?: number;
  maxTokens?: number;
}

/**
 * Parameters for standard generation
 */
export type GenerateParams = BaseGenerateParams;

/**
 * Parameters for generation with callbacks
 */
export interface GenerateWithCallbacksParams extends BaseGenerateParams {
  onChunk: StreamCallback;
  onComplete?: StreamCompleteCallback;
  onError?: StreamErrorCallback;
}
