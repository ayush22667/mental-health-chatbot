/**
 * Voice Routes - WebSocket endpoints for voice conversations
 * 
 * Provides WebSocket endpoint for bidirectional audio streaming
 * with Amazon Nova Sonic for real-time voice conversations.
 */

import { Router } from 'express';
import expressWs from 'express-ws';
import { VoiceService } from '../services/VoiceService';
import { VoiceLanguageCode } from '../interfaces/voice';

// Create router with WebSocket support
const router = Router();
const wsInstance = expressWs(router as any);
const wsRouter = wsInstance.app;

const voiceService = new VoiceService();

// WebSocket endpoint for voice conversation
wsRouter.ws('/conversation', async (ws, req) => {
  const sessionId = (req.query.sessionId as string) || 'anonymous';
  const language = ((req.query.language as string) || 'en-IN') as VoiceLanguageCode;

  console.log(`Voice WebSocket connected: session=${sessionId}, language=${language}`);

  let audioBuffer: Buffer[] = [];
  let conversationActive = false;
  let connectionTimeout: NodeJS.Timeout;

  // Set connection timeout (10 minutes)
  const maxDuration = parseInt(process.env.VOICE_MAX_CONVERSATION_DURATION || '600000', 10);
  connectionTimeout = setTimeout(() => {
    console.log('Voice conversation timeout, closing connection');
    ws.close(1000, 'Conversation timeout');
  }, maxDuration);

  ws.on('message', async (data: Buffer) => {
    try {
      // Skip empty messages
      if (!data || data.length === 0) {
        return;
      }

      // Accumulate audio chunks
      audioBuffer.push(data);
      
      console.log(`Received audio chunk: ${data.length} bytes, total chunks: ${audioBuffer.length}`);

      // Process when we have enough audio (approximately 2 seconds worth)
      // Wait for more data to ensure we have meaningful audio
      const minChunks = 20; // Collect at least 20 chunks before processing

      if (audioBuffer.length >= minChunks && !conversationActive) {
        conversationActive = true;

        // Copy buffer before clearing
        const currentBuffer = [...audioBuffer];
        audioBuffer = [];

        console.log(`Processing ${currentBuffer.length} audio chunks, total size: ${currentBuffer.reduce((sum, buf) => sum + buf.length, 0)} bytes`);

        // Create async generator from audio buffer
        const audioStream = async function* () {
          for (const chunk of currentBuffer) {
            yield chunk;
          }
        };

        try {
          // Get system prompt based on language
          const systemPrompt = getSystemPrompt(language);

          // Stream to Nova Sonic and get audio response
          const responseStream = voiceService.handleVoiceConversation(audioStream(), {
            sessionId,
            language,
            systemPrompt,
            tools: [],
            conversationHistory: [], // TODO: Retrieve from SessionService
          });

          // Stream audio response back to client
          for await (const audioChunk of responseStream) {
            if (ws.readyState === ws.OPEN) {
              ws.send(audioChunk.data);
            } else {
              console.log('WebSocket closed, stopping audio stream');
              break;
            }
          }
        } catch (error) {
          console.error('Voice conversation error:', error);
          if (ws.readyState === ws.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'error',
                error: 'Voice processing failed',
                message: error instanceof Error ? error.message : 'Unknown error',
              })
            );
          }
        } finally {
          conversationActive = false;
        }
      }
    } catch (error) {
      console.error('WebSocket message handling error:', error);
      if (ws.readyState === ws.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'error',
            error: 'Message processing failed',
          })
        );
      }
    }
  });

  ws.on('close', () => {
    console.log('Voice WebSocket closed');
    clearTimeout(connectionTimeout);
    audioBuffer = [];
  });

  ws.on('error', (error) => {
    console.error('Voice WebSocket error:', error);
    clearTimeout(connectionTimeout);
  });

  // Send connection confirmation
  ws.send(
    JSON.stringify({
      type: 'connected',
      sessionId,
      language,
      message: 'Voice conversation ready',
    })
  );
});

/**
 * Get system prompt based on language
 */
function getSystemPrompt(language: VoiceLanguageCode): string {
  const prompts: Record<VoiceLanguageCode, string> = {
    'en-IN': `You are a supportive mental health assistant providing between-session support for Indian users. You are NOT a therapist and cannot diagnose, treat, or provide medical advice.

Your role:
- Offer evidence-based coping strategies (CBT, ACT, grounding techniques)
- Provide psychoeducation on mental health topics
- Encourage users to reach out to professionals when needed
- Be culturally sensitive to Indian family dynamics and social context

Boundaries:
- Never diagnose mental health conditions
- Never provide medication advice
- Never claim to replace therapy
- Always cite sources for educational information

Tone: Warm, empathetic, non-judgmental, clear, and supportive. Speak at a calm pace (0.90 speaking rate) appropriate for mental health conversations.`,

    'hi-IN': `आप एक सहायक मानसिक स्वास्थ्य सहायक हैं जो भारतीय उपयोगकर्ताओं के लिए सत्रों के बीच सहायता प्रदान करते हैं। आप एक चिकित्सक नहीं हैं और निदान, उपचार, या चिकित्सा सलाह प्रदान नहीं कर सकते।

आपकी भूमिका:
- साक्ष्य-आधारित मुकाबला रणनीतियाँ प्रदान करना (CBT, ACT, ग्राउंडिंग तकनीक)
- मानसिक स्वास्थ्य विषयों पर शिक्षा प्रदान करना
- उपयोगकर्ताओं को आवश्यकता पड़ने पर पेशेवरों से संपर्क करने के लिए प्रोत्साहित करना
- भारतीय पारिवारिक गतिशीलता और सामाजिक संदर्भ के प्रति सांस्कृतिक रूप से संवेदनशील रहना

सीमाएं:
- कभी भी मानसिक स्वास्थ्य स्थितियों का निदान न करें
- कभी भी दवा की सलाह न दें
- कभी भी चिकित्सा को प्रतिस्थापित करने का दावा न करें
- शैक्षिक जानकारी के लिए हमेशा स्रोतों का हवाला दें

स्वर: गर्मजोशी भरा, सहानुभूतिपूर्ण, गैर-निर्णयात्मक, स्पष्ट और सहायक। शांत गति से बोलें (0.88 बोलने की दर) जो मानसिक स्वास्थ्य बातचीत के लिए उपयुक्त है।`,
  };

  return prompts[language] || prompts['en-IN'];
}

export default router;
