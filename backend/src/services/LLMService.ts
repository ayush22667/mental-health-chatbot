/**
 * LLM Service for AI Response Generation
 * 
 * Handles integration with multiple LLM providers via strategy pattern
 * Supports streaming responses via SSE
 */

import { streamingService } from './StreamingService';
import { config } from '../config';
import { BaseLLMProvider } from './llm/BaseLLMProvider';
import { LLMProviderFactory } from './llm/LLMProviderFactory';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMStreamOptions {
  rayId: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  language?: string;
}

export class LLMService {
  private provider: BaseLLMProvider;

  constructor() {
    const useSimulated = !process.env.AWS_REGION || process.env.USE_SIMULATED_LLM === 'true';
    
    try {
      this.provider = LLMProviderFactory.createProvider(
        config.bedrock.modelId,
        config.aws.region,
        useSimulated
      );
    } catch (error) {
      console.warn('⚠️ Failed to initialize LLM provider, falling back to simulated:', error);
      this.provider = LLMProviderFactory.createProvider('simulated', 'local', true);
    }
  }

  /**
   * Generate streaming response from LLM
   * Streams tokens in real-time via SSE
   * Returns the complete response text
   */
  async generateStreamingResponse(options: LLMStreamOptions): Promise<string> {
    const {
      rayId,
      messages,
      temperature = 0.7,
      maxTokens = 300,
      language = 'en',
    } = options;

    console.log(`Generating response with ${this.provider.getProviderName()}`);

    try {
      const response = await this.provider.generateStreamingResponse(
        { messages, temperature, maxTokens, language },
        {
          onToken: (token: string) => {
            streamingService.streamToken(rayId, token);
          },
          onMetadata: (metadata: any) => {
            streamingService.streamMetadata(rayId, metadata);
          },
          onComplete: () => {
            streamingService.completeStream(rayId);
          },
          onError: (error: Error) => {
            console.error('Provider error:', error);
            streamingService.streamError(rayId, error.message);
            streamingService.completeStream(rayId);
          },
        }
      );

      return response;

    } catch (error: any) {
      console.error('LLM service error:', error);
      streamingService.streamError(rayId, error.message || 'LLM generation failed');
      streamingService.completeStream(rayId);
      throw error;
    }
  }

  /**
   * Generate non-streaming response (fallback)
   */
  async generateResponse(messages: LLMMessage[]): Promise<string> {
    // For non-streaming, we can still use the streaming method
    // but just collect all tokens
    const rayId = 'non-streaming';
    return this.generateStreamingResponse({
      rayId,
      messages,
      temperature: 0.7,
      maxTokens: 300,
      language: 'en',
    });
  }
}

// Singleton instance
export const llmService = new LLMService();
