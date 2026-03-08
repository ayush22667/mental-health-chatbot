/**
 * User and preferences types
 */

import { Language } from './common';

export interface UserPreferences {
  userId: string;
  language: Language;
  tone: 'formal' | 'casual';
  goals: string[];
  journalingEnabled: boolean;
  consentFlags: ConsentFlags;
  createdAt: number;
  updatedAt: number;
}

export interface ConsentFlags {
  conversationStorage: boolean;
  crisisEscalation: boolean;
  dataRetentionAcknowledged: boolean;
}
