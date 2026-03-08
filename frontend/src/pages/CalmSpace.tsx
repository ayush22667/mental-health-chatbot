/**
 * CalmSpace Page
 * Main landing page for the mental health chat interface
 * Displays a calm, minimal UI with welcome message and chat input
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { WelcomePanel } from '../components/WelcomePanel';
import { ChatInputBar } from '../components/ChatInputBar';
import { apiService } from '../services/ApiService';

export const CalmSpace: React.FC = () => {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string>('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Create session on mount
  useEffect(() => {
    createSession();
  }, []);

  const createSession = async () => {
    try {
      setIsCreatingSession(true);
      const session = await apiService.createSession('en');
      setSessionId(session.sessionId);
      console.log('Session created:', session.sessionId);
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!sessionId) {
      console.error('No session ID available');
      return;
    }

    try {
      console.log('Sending message:', message);
      
      // Navigate to chat page with the session and initial message
      // The ChatPage will handle sending the message and displaying responses
      navigate('/chat', { state: { sessionId, initialMessage: message } });
      
    } catch (error) {
      console.error('Failed to navigate to chat:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5f3] via-[#f8f8f6] to-[#f5f5f3] flex flex-col">
      {/* Top Navigation Bar */}
      <TopBar />

      {/* Main Content Area */}
      <main 
        className="flex-1 flex items-center justify-center pt-20 pb-32"
        role="main"
      >
        <WelcomePanel />
      </main>

      {/* Bottom Input Bar */}
      <ChatInputBar 
        onSendMessage={handleSendMessage}
        disabled={isCreatingSession || !sessionId}
      />
    </div>
  );
};

export default CalmSpace;
