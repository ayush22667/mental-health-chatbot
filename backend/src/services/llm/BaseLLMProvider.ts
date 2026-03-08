/**
 * Base LLM Provider Interface
 * All LLM providers must implement this interface
 */

import { LLMMessage } from '../LLMService';

export interface LLMStreamCallbacks {
  onToken: (token: string) => void;
  onMetadata: (metadata: any) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export interface LLMStreamOptions {
  messages: LLMMessage[];
  temperature: number;
  maxTokens: number;
  language: string;
}

export abstract class BaseLLMProvider {
  protected modelId: string;
  protected region: string;

  constructor(modelId: string, region: string) {
    this.modelId = modelId;
    this.region = region;
  }

  /**
   * Generate streaming response
   * Returns the complete response text
   */
  abstract generateStreamingResponse(
    options: LLMStreamOptions,
    callbacks: LLMStreamCallbacks
  ): Promise<string>;

  /**
   * Get provider name
   */
  abstract getProviderName(): string;

  /**
   * Check if provider is available
   */
  abstract isAvailable(): Promise<boolean>;
}
