/**
 * Core type definitions for the Mental Health Chat Assistant
 */

export enum RiskLevel {
  Normal = 0,
  Elevated = 1,
  Crisis = 2,
}

export enum ConversationMode {
  EmotionalSupport = 'emotional_support',
  QuickCalm = 'quick_calm',
  GuidedExercise = 'guided_exercise',
  Journaling = 'journaling',
  CrisisHandling = 'crisis_handling',
}

export enum SafetyViolation {
  MedicalDiagnosis = 'medical_diagnosis',
  MedicationAdvice = 'medication_advice',
  TherapeuticClaim = 'therapeutic_claim',
  IdentifiableMedicalInfo = 'identifiable_medical_info',
}

export type Language = 'en' | 'hi' | 'hinglish';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  riskLevel?: RiskLevel;
  citations?: Citation[];
}

export interface Citation {
  source: string;
  sourceUrl: string;
  content: string;
}

export interface Session {
  sessionId: string;
  userId?: string;
  conversationHistory: Message[];
  riskLevel: RiskLevel;
  language: Language;
  mode: ConversationMode;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  metadata: {
    totalMessages: number;
    riskEvents: RiskEvent[];
    exercisesCompleted: string[];
  };
}

export interface RiskEvent {
  timestamp: number;
  riskLevel: RiskLevel;
  riskScore: number;
  triggeredBy: string;
}

export interface RiskAssessmentRequest {
  message: string;
  conversationHistory: Message[];
  language: Language;
}

export interface RiskAssessmentResponse {
  riskLevel: RiskLevel;
  riskScore: number;
  triggeredKeywords?: string[];
  classifierConfidence: number;
  policy: ResponsePolicy;
}

export interface ResponsePolicy {
  allowNormalResponse: boolean;
  insertCheckIn: boolean;
  displayCrisisResources: boolean;
  disableChatInput: boolean;
  triggerEscalation: boolean;
}

export interface CrisisResource {
  name: string;
  phone: string;
  description: string;
  availability: string;
  clickToCall: boolean;
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  steps: ExerciseStep[];
  category: 'grounding' | 'breathing' | 'cbt' | 'act';
  language: Language;
}

export interface ExerciseStep {
  instruction: string;
  duration?: number; // seconds
  audioUrl?: string;
}

export interface JournalEntry {
  entryId: string;
  userId: string;
  content: string;
  createdAt: number;
  language: Language;
  wordCount: number;
}

export interface UserPreferences {
  userId: string;
  language: Language;
  tone: 'formal' | 'casual';
  goals: string[];
  journalingEnabled: boolean;
  consentFlags: {
    conversationStorage: boolean;
    crisisEscalation: boolean;
    dataRetentionAcknowledged: boolean;
  };
  createdAt: number;
  updatedAt: number;
}

export interface ContentChunk {
  content: string;
  metadata: {
    source: string;
    sourceUrl: string;
    category: string;
    language: Language;
    confidence: number;
  };
}

export interface RetrievalRequest {
  query: string;
  language: Language;
  topK: number;
  filters?: {
    category?: string[];
    source?: string[];
  };
}

export interface RetrievalResponse {
  chunks: ContentChunk[];
  retrievalTime: number;
}

export interface GenerateResponseRequest {
  systemPrompt: string;
  conversationHistory: Message[];
  retrievedContext: ContentChunk[];
  userMessage: string;
  language: Language;
  temperature: number;
  maxTokens: number;
}

export interface GenerateResponseResponse {
  response: string;
  tokensUsed: number;
  generationTime: number;
  model: string;
}

export interface ResponseValidationRequest {
  response: string;
  language: Language;
}

export interface ResponseValidationResponse {
  isValid: boolean;
  violations: SafetyViolation[];
  replacementResponse?: string;
}

export interface EscalationRequest {
  sessionId: string;
  riskLevel: RiskLevel;
  triggerReason: string;
  sessionSummary: string;
  timestamp: number;
}

export interface EscalationResponse {
  ticketId: string;
  notificationsSent: string[];
}
