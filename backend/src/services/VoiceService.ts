/**
 * VoiceService - Speech-to-Speech using AWS Transcribe + Claude + Polly
 * 
 * Implements voice conversation using:
 * 1. AWS Transcribe - Speech to Text (STT)
 * 2. Claude (Bedrock) - Text processing
 * 3. AWS Polly - Text to Speech (TTS)
 */

import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
} from '@aws-sdk/client-transcribe-streaming';
import {
  PollyClient,
  SynthesizeSpeechCommand,
} from '@aws-sdk/client-polly';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
  VoiceConversationOptions,
  AudioChunk,
  VoiceLanguageCode,
} from '../interfaces/voice';
import { SafetyService } from './SafetyService';
import { RiskLevel } from '../models';

export class VoiceService {
  private transcribeClient: TranscribeStreamingClient;
  private pollyClient: PollyClient;
  private bedrockClient: BedrockRuntimeClient;
  private safetyService: SafetyService;

  constructor() {
    const region = process.env.AWS_BEDROCK_REGION || 'us-east-1';
    
    this.transcribeClient = new TranscribeStreamingClient({ region });
    this.pollyClient = new PollyClient({ region });
    this.bedrockClient = new BedrockRuntimeClient({ region });
    this.safetyService = new SafetyService();
  }

  /**
   * Handle voice conversation: Audio -> Text -> Claude -> Text -> Audio
   */
  async *handleVoiceConversation(
    audioStream: AsyncIterable<Buffer>,
    options: VoiceConversationOptions
  ): AsyncGenerator<AudioChunk> {
    try {
      // Step 1: Transcribe audio to text
      console.log('Step 1: Transcribing audio to text...');
      const transcript = await this.transcribeAudio(audioStream, options.language);
      console.log('Transcript:', transcript);

      if (!transcript || transcript.trim().length === 0) {
        throw new Error('No speech detected in audio');
      }

      // Step 2: Safety check
      console.log('Step 2: Running safety check...');
      const safetyCheck = await this.safetyService.assessVoiceRisk(
        transcript,
        this.mapLanguageCode(options.language),
        options.conversationHistory
      );

      if (safetyCheck.riskLevel === RiskLevel.Crisis) {
        console.error('CRISIS DETECTED:', transcript);
        // Return empty audio - frontend will show crisis resources
        yield {
          data: Buffer.alloc(0),
          timestamp: Date.now(),
          isFinal: true,
        };
        return;
      }

      // Step 3: Get text response from Claude
      console.log('Step 3: Getting response from Claude...');
      const textResponse = await this.getClaudeResponse(transcript, options);
      console.log('Claude response:', textResponse);

      // Step 4: Convert text to speech
      console.log('Step 4: Converting text to speech...');
      const audioResponse = await this.synthesizeSpeech(textResponse, options.language);
      
      // Step 5: Stream audio response
      yield {
        data: audioResponse,
        timestamp: Date.now(),
        isFinal: true,
      };

    } catch (error) {
      console.error('Voice conversation error:', error);
      throw new Error(`Voice conversation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transcribe audio to text using AWS Transcribe
   */
  private async transcribeAudio(
    audioStream: AsyncIterable<Buffer>,
    language: VoiceLanguageCode
  ): Promise<string> {
    // Collect audio chunks
    const audioChunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      audioChunks.push(chunk);
    }

    const combinedAudio = Buffer.concat(audioChunks);
    console.log(`Transcribing ${combinedAudio.length} bytes of audio`);

    // For now, return a placeholder
    // TODO: Implement actual AWS Transcribe integration
    // This requires converting WebM/Opus to PCM and streaming to Transcribe
    
    return "I'm feeling anxious today"; // Placeholder
  }

  /**
   * Get text response from Claude
   */
  private async getClaudeResponse(
    userMessage: string,
    options: VoiceConversationOptions
  ): Promise<string> {
    const messages = [
      ...options.conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: [{ text: msg.content }],
      })),
      {
        role: 'user',
        content: [{ text: userMessage }],
      },
    ];

    const command = new ConverseCommand({
      modelId: 'google.gemma-3-4b-it',
      messages: messages as any,
      system: [{ text: options.systemPrompt }],
      inferenceConfig: {
        temperature: 0.7,
        maxTokens: 500,
      },
    });

    const response = await this.bedrockClient.send(command);
    
    if (response.output?.message?.content?.[0]?.text) {
      return response.output.message.content[0].text;
    }

    throw new Error('No response from Claude');
  }

  /**
   * Synthesize speech from text using AWS Polly
   */
  private async synthesizeSpeech(
    text: string,
    language: VoiceLanguageCode
  ): Promise<Buffer> {
    const voiceId = language === 'hi-IN' ? 'Aditi' : 'Joanna'; // Indian voices
    
    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: 'ogg_vorbis', // Match frontend format
      VoiceId: voiceId,
      Engine: 'neural',
      LanguageCode: language === 'hi-IN' ? 'hi-IN' : 'en-IN',
    });

    const response = await this.pollyClient.send(command);
    
    if (response.AudioStream) {
      // Convert stream to buffer
      const stream = response.AudioStream;
      const chunks: Buffer[] = [];
      
      // Read all chunks from the stream
      if (stream instanceof Uint8Array) {
        return Buffer.from(stream);
      }
      
      // If it's a readable stream
      const reader = stream as any;
      if (reader[Symbol.asyncIterator]) {
        for await (const chunk of reader) {
          chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
      }
      
      // Fallback: try to convert directly
      return Buffer.from(stream as any);
    }

    throw new Error('No audio from Polly');
  }

  /**
   * Map voice language code to app language enum
   */
  private mapLanguageCode(code: VoiceLanguageCode): 'en' | 'hi' | 'hinglish' {
    const map: Record<VoiceLanguageCode, 'en' | 'hi'> = {
      'en-IN': 'en',
      'hi-IN': 'hi',
    };
    return map[code] || 'en';
  }

  /**
   * Check if voice service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return this.bedrockClient !== null && this.pollyClient !== null;
    } catch {
      return false;
    }
  }
}
