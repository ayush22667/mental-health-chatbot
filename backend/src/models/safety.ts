/**
 * Safety and risk assessment types
 */

import { Message, RiskLevel, Language, SafetyViolation } from './common';

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

export interface ResponseValidationRequest {
  response: string;
  language: Language;
}

export interface ResponseValidationResponse {
  isValid: boolean;
  violations: SafetyViolation[];
  replacementResponse?: string;
}

export interface CrisisResource {
  name: string;
  phone: string;
  description: string;
  availability: string;
  clickToCall: boolean;
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
