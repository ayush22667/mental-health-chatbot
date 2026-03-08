/**
 * API Service for backend communication
 * 
 * Handles all HTTP requests to the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
   * Create a new chat session
   */
  async createSession(language: string = 'en'): Promise<Session> {
    const response = await fetch(`${this.baseUrl}/api/session/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const response = await fetch(`${this.baseUrl}/api/session/${sessionId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get conversation history
   */
  async getHistory(sessionId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/session/${sessionId}/history`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * End a session
   */
  async endSession(sessionId: string, saveInsights: boolean = false): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/session/${sessionId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const response = await fetch(`${this.baseUrl}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
