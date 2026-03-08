/**
 * Production LLM Service with Multiple Provider Support
 * 
 * Supports:
 * - AWS Bedrock (Claude) - Recommended for production
 * - OpenAI (GPT-4)
 * - Simulated (for testing)
 * 
 * Automatically selects provider based on environment variables
 */

import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import OpenAI from 'openai';
import { streamingService } from './StreamingService';

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

type LLMProvider = 'bedrock' | 'openai' | 'simulated';

export class LLMService {
  private provider: LLMProvider;
  private bedrockClient?: BedrockRuntimeClient;
  private openaiClient?: OpenAI;
  private bedrockModelId: string;

  constructor() {
    // Auto-detect provider based on environment variables
    if (process.env.AWS_BEDROCK_ENABLED === 'true' && process.env.AWS_REGION) {
      this.provider = 'bedrock';
      this.bedrockClient = new BedrockRuntimeClient({
        region: process.env.AWS_REGION || 'ap-south-1',
      });
      this.bedrockModelId = process.env.BEDROCK_MODEL_ID;
      console.log(`🤖 LLM Provider: AWS Bedrock (${this.bedrockModelId})`);
    } else if (process.env.OPENAI_API_KEY) {
      this.provider = 'openai';
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log('🤖 LLM Provider: OpenAI');
    } else {
      this.provider = 'simulated';
      console.log('🤖 LLM Provider: Simulated (for testing)');
    }
  }

  /**
   * Generate streaming response from LLM
   * Streams tokens in real-time via SSE
   */
  async generateStreamingResponse(options: LLMStreamOptions): Promise<void> {
    const {
      rayId,
      messages,
      temperature = 0.7,
      maxTokens = 300,
      language = 'en',
    } = options;

    try {
      // Stream metadata first
      streamingService.streamMetadata(rayId, {
        language,
        model: this.getModelName(),
        provider: this.provider,
        temperature,
      });

      // Route to appropriate provider
      switch (this.provider) {
        case 'bedrock':
          await this.streamFromBedrock(rayId, messages, temperature, maxTokens);
          break;
        case 'openai':
          await this.streamFromOpenAI(rayId, messages, temperature, maxTokens);
          break;
        case 'simulated':
          await this.streamSimulated(rayId, language);
          break;
      }

      // Complete the stream
      streamingService.completeStream(rayId);

    } catch (error: any) {
      console.error('LLM streaming error:', error);
      streamingService.streamError(rayId, error.message || 'LLM generation failed');
      streamingService.completeStream(rayId);
    }
  }

  /**
   * Stream from AWS Bedrock (Claude)
   */
  private async streamFromBedrock(
    rayId: string,
    messages: LLMMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<void> {
    if (!this.bedrockClient) {
      throw new Error('Bedrock client not initialized');
    }

    // Convert messages to Claude format
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role,
        content: m.content,
      }));

    // Prepare request
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: this.bedrockModelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        temperature: temperature,
        system: systemMessage,
        messages: conversationMessages,
      }),
    });

    // Stream response
    const response = await this.bedrockClient.send(command);

    if (response.body) {
      for await (const chunk of response.body) {
        if (chunk.chunk?.bytes) {
          const text = new TextDecoder().decode(chunk.chunk.bytes);
          const data = JSON.parse(text);

          // Handle different event types
          if (data.type === 'content_block_delta' && data.delta?.text) {
            streamingService.streamToken(rayId, data.delta.text);
          }
        }
      }
    }
  }

  /**
   * Stream from OpenAI (GPT-4)
   */
  private async streamFromOpenAI(
    rayId: string,
    messages: LLMMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<void> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const stream = await this.openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: messages as any,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        streamingService.streamToken(rayId, content);
      }
    }
  }

  /**
   * Stream simulated response (for testing)
   */
  private async streamSimulated(rayId: string, language: string): Promise<void> {
    const simulatedResponse = this.getSimulatedResponse(language);
    const words = simulatedResponse.split(' ');

    // Stream tokens word by word
    for (const word of words) {
      await this.delay(50);
      streamingService.streamToken(rayId, word + ' ');
    }
  }

  /**
   * Generate non-streaming response (fallback)
   */
  async generateResponse(messages: LLMMessage[]): Promise<string> {
    switch (this.provider) {
      case 'bedrock':
        return await this.generateFromBedrock(messages);
      case 'openai':
        return await this.generateFromOpenAI(messages);
      case 'simulated':
        return this.getSimulatedResponse('en');
    }
  }

  /**
   * Generate from Bedrock (non-streaming)
   */
  private async generateFromBedrock(messages: LLMMessage[]): Promise<string> {
    if (!this.bedrockClient) {
      throw new Error('Bedrock client not initialized');
    }

    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role,
        content: m.content,
      }));

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: this.bedrockModelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 300,
        temperature: 0.7,
        system: systemMessage,
        messages: conversationMessages,
      }),
    });

    const response = await this.bedrockClient.send(command);
    let fullResponse = '';

    if (response.body) {
      for await (const chunk of response.body) {
        if (chunk.chunk?.bytes) {
          const text = new TextDecoder().decode(chunk.chunk.bytes);
          const data = JSON.parse(text);

          if (data.type === 'content_block_delta' && data.delta?.text) {
            fullResponse += data.delta.text;
          }
        }
      }
    }

    return fullResponse;
  }

  /**
   * Generate from OpenAI (non-streaming)
   */
  private async generateFromOpenAI(messages: LLMMessage[]): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openaiClient.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Get simulated response for testing
   */
  private getSimulatedResponse(language: string): string {
    const responses: Record<string, string> = {
      en: "I hear that you're feeling stressed. It's completely normal to feel overwhelmed sometimes. Would you like to try a quick breathing exercise to help you feel more grounded?",
      hi: "मैं समझता हूं कि आप तनाव महसूस कर रहे हैं। कभी-कभी अभिभूत महसूस करना पूरी तरह से सामान्य है। क्या आप अधिक स्थिर महसूस करने में मदद के लिए एक त्वरित श्वास व्यायाम करना चाहेंगे?",
      hinglish: "Main samajhta hoon ki aap stress feel kar rahe hain. Kabhi kabhi overwhelmed feel karna bilkul normal hai. Kya aap ek quick breathing exercise try karna chahenge?",
    };

    return responses[language] || responses.en;
  }

  /**
   * Get model name for metadata
   */
  private getModelName(): string {
    switch (this.provider) {
      case 'bedrock':
        return this.bedrockModelId;
      case 'openai':
        return process.env.OPENAI_MODEL || 'gpt-4';
      case 'simulated':
        return 'simulated';
    }
  }

  /**
   * Delay helper for simulation
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current provider
   */
  getProvider(): LLMProvider {
    return this.provider;
  }

  /**
   * Check if using real LLM
   */
  isRealLLM(): boolean {
    return this.provider !== 'simulated';
  }
}

// Singleton instance
export const llmService = new LLMService();
