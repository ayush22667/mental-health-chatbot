/**
 * Session-related types
 */

import { Message, RiskLevel, Language, ConversationMode } from './common';

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
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  totalMessages: number;
  riskEvents: RiskEvent[];
  exercisesCompleted: string[];
}

export interface RiskEvent {
  timestamp: number;
  riskLevel: RiskLevel;
  riskScore: number;
  triggeredBy: string;
}

export interface CreateSessionRequest {
  userId?: string;
  language: Language;
  preferences?: any;
}

export interface CreateSessionResponse {
  sessionId: string;
  expiresAt: number;
}

export interface GetHistoryResponse {
  messages: Message[];
  sessionMetadata: SessionMetadata;
}

export interface EndSessionRequest {
  saveInsights: boolean;
}
