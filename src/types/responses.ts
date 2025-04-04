/**
 * Standard LLM response format
 */
export interface LLMResponse {
  text: string;
  metadata: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

/**
 * Stream callback types
 */
export type StreamCallback = (chunk: string) => void;
export type StreamCompleteCallback = (response: LLMResponse) => void;
export type StreamErrorCallback = (error: Error) => void;

/**
 * Stream callbacks configuration
 */
export interface StreamCallbacks {
  onChunk: StreamCallback;
  onComplete?: StreamCompleteCallback;
  onError?: StreamErrorCallback;
}
