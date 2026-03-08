/**
 * Content and exercise types
 */

import { Language } from './common';

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

export interface GetExercisesRequest {
  language: Language;
  category?: string;
  duration?: 'short' | 'medium'; // 2-5 min or 5-15 min
}

export interface GetExercisesResponse {
  exercises: Exercise[];
}

export interface GetExerciseResponse {
  exercise: Exercise;
}

export interface SubmitFeedbackRequest {
  sessionId: string;
  helpful: boolean;
  completed: boolean;
  notes?: string;
}

export interface ContentChunk {
  content: string;
  metadata: ContentMetadata;
}

export interface ContentMetadata {
  source: string;
  sourceUrl: string;
  category: string;
  language: Language;
  confidence: number;
}
