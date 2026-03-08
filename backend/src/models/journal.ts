/**
 * Journal-related types
 */

import { Language } from './common';

export interface JournalEntry {
  entryId: string;
  userId: string;
  content: string;
  createdAt: number;
  language: Language;
  wordCount: number;
}

export interface CreateJournalEntryRequest {
  userId: string;
  content: string;
  language: Language;
}

export interface CreateJournalEntryResponse {
  entryId: string;
  createdAt: number;
}

export interface GetJournalEntriesResponse {
  entries: JournalEntry[];
}
