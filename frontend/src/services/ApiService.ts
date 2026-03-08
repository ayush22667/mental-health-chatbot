/**
 * API Service for backend communication
 * 
 * Handles all HTTP requests to the backend API
 */

import { fetchAuthSession } from 'aws-amplify/auth';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';

export interface Session {
  sessionId: string;
  expiresAt: number;
}

export interface Message {
  messageId: string;
  response: string;
  riskLevel: number;
  timestamp: number;
  chatDisabled?: boolean;
  crisisResources?: any[];
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get authentication headers with Cognito JWT token
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    try {
      // Get current auth session from Cognito
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      // User not authenticated - backend will treat as anonymous
      console.log('No auth token available, using anonymous access');
    }

    return headers;
  }

  /**
   * Create a new chat session
   */
  async createSession(language: string = 'en'): Promise<Session> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}/api/session/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ language }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}/api/session/${sessionId}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get conversation history
   */
  async getHistory(sessionId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}/api/session/${sessionId}/history`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * End a session
   */
  async endSession(sessionId: string, saveInsights: boolean = false): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}/api/session/${sessionId}/end`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ saveInsights }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  /**
   * Send a message (non-streaming)
   */
  async sendMessage(
    sessionId: string,
    message: string,
    language: string = 'en'
  ): Promise<Message> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}/api/chat/message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sessionId,
        message,
        language,
        mode: 'emotional_support',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
}

export const apiService = new ApiService();
