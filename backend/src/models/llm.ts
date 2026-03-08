/**
 * LLM and RAG-related types
 */

import { Message, Language } from './common';
import { ContentChunk } from './content';

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

export interface RetrievalRequest {
  query: string;
  language: Language;
  topK: number;
  filters?: RetrievalFilters;
}

export interface RetrievalFilters {
  category?: string[];
  source?: string[];
}

export interface RetrievalResponse {
  chunks: ContentChunk[];
  retrievalTime: number;
}
