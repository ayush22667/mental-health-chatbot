/**
 * Factory for creating LLM providers
 * Uses strategy pattern to select the appropriate provider
 */

import { BaseLLMProvider } from './BaseLLMProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { TitanProvider } from './TitanProvider';
import { GemmaProvider } from './GemmaProvider';
import { SimulatedProvider } from './SimulatedProvider';

export class LLMProviderFactory {
  static createProvider(modelId: string, region: string, useSimulated: boolean): BaseLLMProvider {
    // If simulated mode, return simulated provider
    if (useSimulated) {
      console.log('ℹ️ Using simulated LLM provider');
      return new SimulatedProvider();
    }

    // Detect provider from model ID
    if (modelId.includes('anthropic') || modelId.includes('claude')) {
      console.log(`✅ Using Claude provider with model: ${modelId}`);
      return new ClaudeProvider(modelId, region);
    } else if (modelId.includes('titan')) {
      console.log(`✅ Using Titan provider with model: ${modelId}`);
      return new TitanProvider(modelId, region);
    } else if (modelId.includes('google') || modelId.includes('gemma')) {
      console.log(`✅ Using Gemma provider with model: ${modelId}`);
      return new GemmaProvider(modelId, region);
    } else {
      console.warn(`⚠️ Unknown model ID: ${modelId}, falling back to simulated`);
      return new SimulatedProvider();
    }
  }
}
