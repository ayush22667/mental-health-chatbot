/**
 * Amazon Titan LLM Provider
 */

import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { BaseLLMProvider, LLMStreamCallbacks, LLMStreamOptions } from './BaseLLMProvider';

export class TitanProvider extends BaseLLMProvider {
  private client: BedrockRuntimeClient;

  constructor(modelId: string, region: string) {
    super(modelId, region);
    this.client = new BedrockRuntimeClient({ region });
  }

  async generateStreamingResponse(
    options: LLMStreamOptions,
    callbacks: LLMStreamCallbacks
  ): Promise<string> {
    let completeResponse = '';

    try {
      // Build conversation text for Titan
      const systemMessage = options.messages.find(m => m.role === 'system')?.content || '';
      const conversationMessages = options.messages.filter(m => m.role !== 'system');
      
      // Format as conversation
      let inputText = systemMessage ? `${systemMessage}\n\n` : '';
      inputText += conversationMessages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');
      inputText += '\nAssistant:';

      // Prepare Titan request
      const payload = {
        inputText,
        textGenerationConfig: {
          maxTokenCount: options.maxTokens,
          temperature: options.temperature,
          topP: 0.9,
          stopSequences: ['User:'],
        }
      };

      const command = new InvokeModelWithResponseStreamCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      // Send metadata
      callbacks.onMetadata({
        provider: 'titan',
        model: this.modelId,
        temperature: options.temperature,
      });

      const response = await this.client.send(command);

      // Process streaming response
      if (response.body) {
        for await (const event of response.body) {
          if (event.chunk) {
            const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
            
            if (chunk.outputText) {
              const text = chunk.outputText;
              completeResponse += text;
              callbacks.onToken(text);
            } else if (chunk.error) {
              throw new Error(chunk.error);
            }
          }
        }
      }

      callbacks.onComplete();
      return completeResponse;

    } catch (error: any) {
      callbacks.onError(error);
      throw error;
    }
  }

  getProviderName(): string {
    return 'Amazon Titan';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
