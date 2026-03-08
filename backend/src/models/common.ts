/**
 * Common types and enums used across the application
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
