import { v4 as uuidv4 } from 'uuid';
import { RiskLevel, Language, Message } from '../models';
import { SessionService } from './SessionService';
import { SafetyService } from './SafetyService';
import { llmService, LLMMessage } from './LLMService';
import { streamingService } from './StreamingService';
import { ragService } from './RAGService';

export class ChatService {
  private sessionService: SessionService;
  private safetyService: SafetyService;

  constructor() {
    this.sessionService = new SessionService();
    this.safetyService = new SafetyService();
  }

  /**
   * Send a message and get a response
   */
  async sendMessage(params: {
    sessionId: string;
    message: string;
    language: Language;
    mode: string;
  }): Promise<{
    messageId: string;
    response: string;
    riskLevel: RiskLevel;
    citations?: any[];
    suggestedExercises?: any[];
    crisisResources?: any[];
    timestamp: number;
    chatDisabled?: boolean;
  }> {
    const { sessionId, message, language, mode } = params;

    // 1. Retrieve conversation history
    const history = await this.sessionService.getHistory(sessionId);

    // 2. Perform risk assessment
    const riskAssessment = await this.safetyService.assessRisk({
      message,
      conversationHistory: history.messages,
      language,
    });

    // 3. Handle crisis level
    if (riskAssessment.riskLevel === RiskLevel.Crisis) {
      // Update session risk level
      await this.sessionService.updateRiskLevel(
        sessionId,
        RiskLevel.Crisis,
        riskAssessment.riskScore
      );

      // Return crisis resources immediately
      return {
        messageId: uuidv4(),
        response: this.getCrisisResponseTemplate(language),
        riskLevel: RiskLevel.Crisis,
        crisisResources: this.getCrisisResources(language),
        timestamp: Date.now(),
        chatDisabled: true,
      };
    }

    // 4. For Normal/Elevated: Generate response
    // TODO: Integrate with RAG and LLM
    let response = 'This is a placeholder response. LLM integration pending.';

    // 5. Add check-in for elevated risk
    if (riskAssessment.riskLevel === RiskLevel.Elevated) {
      response += '\n\nI hear that you\'re going through a difficult time. Would you like to try a grounding exercise? I also encourage you to reach out to your therapist or a trusted person if you need additional support.';
    }

    // 6. Validate response for safety
    const validation = await this.safetyService.validateResponse({
      response,
      language,
    });

    if (!validation.isValid && validation.replacementResponse) {
      response = validation.replacementResponse;
    }

    // 7. Add messages to session history
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
      riskLevel: riskAssessment.riskLevel,
    };

    await this.sessionService.addMessage(sessionId, userMessage);
    await this.sessionService.addMessage(sessionId, assistantMessage);

    // 8. Return response
    return {
      messageId: assistantMessage.id,
      response,
      riskLevel: riskAssessment.riskLevel,
      timestamp: assistantMessage.timestamp,
    };
  }

  /**
   * Process message with streaming response
   * Streams AI response in real-time via SSE
   */
  async processMessageStreaming(params: {
    sessionId: string;
    message: string;
    language: Language;
    rayId: string;
  }): Promise<void> {
    const { sessionId, message, language, rayId } = params;

    console.log('Processing streaming message:', { sessionId, rayId, message: message.substring(0, 50) });

    try {
      // 1. Check if session is active
      const isActive = await this.sessionService.isActive(sessionId);
      console.log('Session active:', isActive);
      
      if (!isActive) {
        console.error('Session not active:', sessionId);
        streamingService.streamError(rayId, 'Session expired or invalid');
        streamingService.completeStream(rayId);
        return;
      }

      // 2. Assess risk level
      console.log('Assessing risk...');
      const riskAssessment = await this.safetyService.assessRisk({
        message,
        conversationHistory: [],
        language,
      });
      console.log('Risk assessment:', riskAssessment.riskLevel, riskAssessment.riskScore);

      // Stream risk metadata
      streamingService.streamMetadata(rayId, {
        riskLevel: riskAssessment.riskLevel,
        riskScore: riskAssessment.riskScore,
      });

      // 3. Handle crisis level
      if (riskAssessment.riskLevel === RiskLevel.Crisis) {
        console.log('Crisis level detected');
        const crisisResponse = this.getCrisisResponseTemplate(language);
        
        // Stream crisis response
        streamingService.streamToken(rayId, crisisResponse);
        streamingService.streamMetadata(rayId, {
          chatDisabled: true,
          crisisMode: true,
        });
        streamingService.completeStream(rayId);

        // Update session risk level
        await this.sessionService.updateRiskLevel(
          sessionId,
          RiskLevel.Crisis,
          riskAssessment.riskScore
        );

        return;
      }

      // 4. Get conversation history
      console.log('Getting conversation history...');
      const history = await this.sessionService.getHistory(sessionId);

      // 5. Get RAG context for the user's message
      console.log('Retrieving knowledge base context...');
      let ragContext = '';
      try {
        ragContext = await ragService.getContext(message);
        if (ragContext) {
          console.log('RAG context retrieved successfully');
        } else {
          console.log('No relevant RAG context found');
        }
      } catch (error) {
        console.error('RAG retrieval error:', error);
        // Continue without RAG if it fails
      }

      // 6. Save user message FIRST (before building LLM messages)
      console.log('Saving user message...');
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: message,
        timestamp: Date.now(),
      };
      await this.sessionService.addMessage(sessionId, userMessage);

      // 7. Build LLM messages from history (which now includes the current message)
      const llmMessages: LLMMessage[] = [
        {
          role: 'system',
          content: this.getSystemPrompt(language, ragContext),
        },
        ...history.messages.slice(-10).map((msg: any) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        {
          role: 'user',
          content: message,
        },
      ];

      // 8. Generate streaming response
      console.log('Generating streaming response...');
      const assistantResponse = await llmService.generateStreamingResponse({
        rayId,
        messages: llmMessages,
        language,
      });

      // 9. Save assistant message
      console.log('Saving assistant message...');
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: assistantResponse,
        timestamp: Date.now(),
      };
      await this.sessionService.addMessage(sessionId, assistantMessage);

      console.log('Streaming response completed');

      // Note: Assistant message is now saved to maintain conversation history

    } catch (error: any) {
      console.error('Streaming chat error:', error);
      streamingService.streamError(rayId, error.message || 'Chat processing failed');
      streamingService.completeStream(rayId);
    }
  }

  /**
   * Get crisis response template
   */
  private getCrisisResponseTemplate(language: Language): string {
    const templates = {
      en: "I'm really concerned about your safety. Please contact these services immediately. They are trained to help you right now.",
      hi: "मुझे आपकी सुरक्षा के बारे में बहुत चिंता है। कृपया इन सेवाओं से तुरंत संपर्क करें। वे अभी आपकी मदद करने के लिए प्रशिक्षित हैं।",
      hinglish: "Mujhe aapki safety ke baare mein bahut chinta hai. Please in services se turant contact karein. Ye abhi aapki help karne ke liye trained hain.",
    };

    return templates[language] || templates.en;
  }

  /**
   * Get crisis resources
   */
  private getCrisisResources(language: Language) {
    return [
      {
        name: 'KIRAN Mental Health Helpline',
        phone: '1800-599-0019',
        description: '24/7 toll-free mental health support',
        availability: '24/7',
        clickToCall: true,
      },
      {
        name: 'Vandrevala Foundation',
        phone: '+91 9999 666 555',
        description: '24/7 mental health helpline',
        availability: '24/7',
        clickToCall: true,
      },
      {
        name: 'iCall (TISS)',
        phone: '+91 9152987821',
        description: 'Psychosocial helpline',
        availability: 'Mon-Sat, 8 AM - 10 PM',
        clickToCall: true,
      },
      {
        name: 'Emergency Services',
        phone: '112',
        description: 'National emergency number',
        availability: '24/7',
        clickToCall: true,
      },
    ];
  }

  /**
   * Get system prompt for LLM based on language
   */
  private getSystemPrompt(language: Language, ragContext?: string): string {
    const basePrompts: Record<Language, string> = {
      en: `You are a compassionate mental health support assistant. You provide emotional support, coping strategies, and psychoeducation. You are NOT a therapist and do NOT provide medical advice, diagnosis, or treatment..`,
      hi: `आप एक दयालु मानसिक स्वास्थ्य सहायता सहायक हैं। आप भावनात्मक समर्थन, मुकाबला रणनीतियाँ और मनोशिक्षा प्रदान करते हैं। आप एक चिकित्सक नहीं हैं और चिकित्सा सलाह, निदान या उपचार प्रदान नहीं करते हैं। हमेशा उपयोगकर्ताओं को आवश्यकता पड़ने पर पेशेवर मदद लेने के लिए प्रोत्साहित करें। सहानुभूतिपूर्ण, गैर-निर्णयात्मक और सहायक बनें।`,
      hinglish: `Aap ek compassionate mental health support assistant hain. Aap emotional support, coping strategies, aur psychoeducation provide karte hain. Aap therapist NAHI hain aur medical advice, diagnosis, ya treatment provide NAHI karte. Hamesha users ko encourage karein ki zarurat padne par professional help lein. Empathetic, non-judgmental, aur supportive rahein.`,
    };

    let prompt = basePrompts[language] || basePrompts.en;

    // Add RAG context if available
    if (ragContext && ragContext.trim().length > 0) {
      const contextIntro = language === 'hi' 
        ? '\n\nयहाँ कुछ प्रासंगिक जानकारी है जो आपकी मदद कर सकती है:\n\n'
        : language === 'hinglish'
        ? '\n\nYahan kuch relevant information hai jo aapki help kar sakti hai:\n\n'
        : '\n\nHere is some relevant information from our knowledge base that may help:\n\n';
      
      prompt += contextIntro + ragContext;
      
      const contextUsage = language === 'hi'
        ? '\n\nइस जानकारी का उपयोग करें, लेकिन अपने शब्दों में उत्तर दें। यदि यह जानकारी प्रासंगिक नहीं है, तो इसे अनदेखा करें।'
        : language === 'hinglish'
        ? '\n\nIs information ka use karein, lekin apne shabdon mein jawab dein. Agar ye information relevant nahi hai, toh ise ignore karein.'
        : '\n\nUse this information to inform your response, but answer in your own words. If this information is not relevant to the user\'s question, you may ignore it.';
      
      prompt += contextUsage;
    }

    return prompt;
  }
}
