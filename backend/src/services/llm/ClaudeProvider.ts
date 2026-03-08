/**
 * Claude LLM Provider (Anthropic via AWS Bedrock)
 */

import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { BaseLLMProvider, LLMStreamCallbacks, LLMStreamOptions } from './BaseLLMProvider';

export class ClaudeProvider extends BaseLLMProvider {
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
      // Convert messages to Claude format
      const systemMessage = options.messages.find(m => m.role === 'system')?.content || '';
      const conversationMessages = options.messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));

      // Ensure messages alternate between user and assistant
      const validatedMessages = this.validateMessageAlternation(conversationMessages);

      // Prepare Claude request
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        system: systemMessage,
        messages: validatedMessages,
      };

      const command = new InvokeModelWithResponseStreamCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      // Send metadata
      callbacks.onMetadata({
        provider: 'claude',
        model: this.modelId,
        temperature: options.temperature,
      });

      const response = await this.client.send(command);

      // Process streaming response
      if (response.body) {
        for await (const event of response.body) {
          if (event.chunk) {
            const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
            
            if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
              const text = chunk.delta.text;
              completeResponse += text;
              callbacks.onToken(text);
            } else if (chunk.type === 'message_stop') {
              break;
            } else if (chunk.type === 'error') {
              throw new Error(chunk.error?.message || 'Claude error');
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

  private validateMessageAlternation(messages: Array<{ role: string; content: string }>) {
    const validated: Array<{ role: string; content: string }> = [];
    let lastRole: string | null = null;

    for (const msg of messages) {
      if (msg.role === lastRole) {
        console.warn('Skipping duplicate role:', msg.role);
        continue;
      }
      validated.push(msg);
      lastRole = msg.role;
    }

    // Ensure starts with user message
    if (validated.length > 0 && validated[0].role !== 'user') {
      validated.shift();
    }

    return validated;
  }

  getProviderName(): string {
    return 'Claude (Anthropic)';
  }

  async isAvailable(): Promise<boolean> {
    // Could add a test call here
    return true;
  }
}
