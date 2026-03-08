/**
 * Google Gemma Provider
 * Handles Google Gemma models via AWS Bedrock
 */

import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { BaseLLMProvider, LLMStreamOptions, LLMStreamCallbacks } from './BaseLLMProvider';

export class GemmaProvider extends BaseLLMProvider {
  private client: BedrockRuntimeClient;

  constructor(modelId: string, region: string) {
    super(modelId, region);
    this.client = new BedrockRuntimeClient({ region });
  }

  getProviderName(): string {
    return 'Gemma';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async generateStreamingResponse(
    options: LLMStreamOptions,
    callbacks: LLMStreamCallbacks
  ): Promise<string> {
    console.log('GemmaProvider: Starting streaming response generation');
    
    const { messages, temperature, maxTokens } = options;
    
    // Gemma models don't support system prompts in Converse API
    // Filter out system messages and prepend to first user message
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystemMessages = messages.filter(m => m.role !== 'system');
    
    const systemPromptPrefix = systemMessages.length > 0 
      ? systemMessages.map(m => m.content).join('\n') + '\n\nUser: '
      : '';
    
    // Convert messages to Bedrock format
    const bedrockMessages = nonSystemMessages.map((msg, index) => {
      const content = index === 0 && systemPromptPrefix 
        ? systemPromptPrefix + msg.content 
        : msg.content;
      
      return {
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: [{ text: content }],
      };
    });

    console.log('GemmaProvider: Prepared messages count:', bedrockMessages.length);

    const command = new ConverseStreamCommand({
      modelId: this.modelId,
      messages: bedrockMessages as any,
      inferenceConfig: {
        temperature,
        maxTokens,
      },
    });

    console.log('GemmaProvider: Sending command to Bedrock...');
    
    try {
      const response = await this.client.send(command);
      console.log('GemmaProvider: Received response from Bedrock');

      let fullResponse = '';
      let tokenCount = 0;

      if (response.stream) {
        console.log('GemmaProvider: Processing stream...');
        
        for await (const event of response.stream) {
          if (event.contentBlockDelta?.delta?.text) {
            const token = event.contentBlockDelta.delta.text;
            tokenCount++;
            
            if (tokenCount <= 3) {
              console.log(`GemmaProvider: Token ${tokenCount}:`, token);
            }
            
            fullResponse += token;
            callbacks.onToken(token);
          }

          if (event.messageStop) {
            console.log('GemmaProvider: Message stop. Total tokens:', tokenCount);
            callbacks.onMetadata({
              stopReason: event.messageStop.stopReason || 'end_turn',
            });
          }
        }
        
        console.log(`GemmaProvider: Stream complete. Total tokens: ${tokenCount}`);
        callbacks.onComplete();
        
      } else {
        console.error('GemmaProvider: No stream in response');
        callbacks.onError(new Error('No stream in response'));
      }

      return fullResponse;
      
    } catch (error: any) {
      console.error('GemmaProvider: Error during streaming:', error);
      callbacks.onError(error);
      throw error;
    }
  }
}
