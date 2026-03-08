/**
 * Chat API request/response types
 */

import { RiskLevel, Language, ConversationMode, Citation } from './common';
import { Exercise } from './content';
import { CrisisResource } from './safety';

export interface SendMessageRequest {
  sessionId: string;
  message: string;
  language: Language;
  mode: ConversationMode;
}

export interface SendMessageResponse {
  messageId: string;
  response: string;
  riskLevel: RiskLevel;
  citations?: Citation[];
  suggestedExercises?: Exercise[];
  crisisResources?: CrisisResource[];
  timestamp: number;
  chatDisabled?: boolean;
}
