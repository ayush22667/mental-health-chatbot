/**
 * Simulated LLM Provider (for testing/fallback)
 */

import { BaseLLMProvider, LLMStreamCallbacks, LLMStreamOptions } from './BaseLLMProvider';

export class SimulatedProvider extends BaseLLMProvider {
  private responses: Record<string, string> = {
    en: "I hear that you're feeling stressed. It's completely normal to feel overwhelmed sometimes. Would you like to try a quick breathing exercise to help you feel more grounded?",
    hi: "मैं समझता हूं कि आप तनाव महसूस कर रहे हैं। कभी-कभी अभिभूत महसूस करना पूरी तरह से सामान्य है। क्या आप अधिक स्थिर महसूस करने में मदद के लिए एक त्वरित श्वास व्यायाम करना चाहेंगे?",
    hinglish: "Main samajhta hoon ki aap stress feel kar rahe hain. Kabhi kabhi overwhelmed feel karna bilkul normal hai. Kya aap ek quick breathing exercise try karna chahenge?",
  };

  constructor() {
    super('simulated', 'local');
  }

  async generateStreamingResponse(
    options: LLMStreamOptions,
    callbacks: LLMStreamCallbacks
  ): Promise<string> {
    try {
      const response = this.responses[options.language] || this.responses.en;
      const words = response.split(' ');

      // Send metadata
      callbacks.onMetadata({
        provider: 'simulated',
        model: 'simulated',
        temperature: options.temperature,
      });

      // Stream word by word
      for (const word of words) {
        await this.delay(50);
        callbacks.onToken(word + ' ');
      }

      callbacks.onComplete();
      return response;

    } catch (error: any) {
      callbacks.onError(error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getProviderName(): string {
    return 'Simulated (Testing)';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
