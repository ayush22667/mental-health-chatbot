import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { StreamingChatInterface } from '../components/StreamingChatInterface';
import { TopBar } from '../components/TopBar';
import { apiService } from '../services/ApiService';
import { useVoiceMode } from '../hooks/useVoiceMode';
import { CrisisResources } from '../voice/interfaces';

export const ChatPage: React.FC = () => {
  const location = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [crisisResources, setCrisisResources] = useState<CrisisResources | null>(null);

  // Initialize voice mode (only when sessionId is available)
  const voiceMode = useVoiceMode({
    sessionId: sessionId || '',
    language: 'en-IN',
    onCrisisDetected: (resources) => {
      setCrisisResources(resources);
    },
  });

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if we have a session from navigation state (from CalmSpace)
      const state = location.state as { sessionId?: string; initialMessage?: string } | null;
      
      if (state?.sessionId) {
        // Use existing session from CalmSpace
        console.log('Using existing session:', state.sessionId);
        setSessionId(state.sessionId);
        setInitialMessage(state.initialMessage || null);
      } else {
        // Create a new session
        const session = await apiService.createSession('en');
        setSessionId(session.sessionId);
        console.log('Session created:', session.sessionId);
      }
      
    } catch (err: any) {
      console.error('Failed to create session:', err);
      setError(err.message || 'Failed to initialize chat session');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing chat session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Connection Error
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={initializeSession}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 
                     transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return null;
  }

  // Handle voice toggle
  const handleVoiceToggle = () => {
    if (voiceMode.voiceState === 'idle') {
      voiceMode.startConversation();
    } else {
      voiceMode.stopConversation();
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <TopBar />

      {/* Crisis Resources Modal */}
      {crisisResources && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              Emergency Resources
            </h2>
            <p className="text-gray-700 mb-4">
              We've detected that you may be in crisis. Please reach out to these resources immediately:
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 rounded">
                <p className="font-semibold">KIRAN Mental Health Helpline</p>
                <a href={`tel:${crisisResources.kiran}`} className="text-blue-600 text-lg">
                  {crisisResources.kiran}
                </a>
              </div>
              <div className="p-3 bg-red-50 rounded">
                <p className="font-semibold">Vandrevala Foundation</p>
                <a href={`tel:${crisisResources.vandrevala}`} className="text-blue-600 text-lg">
                  {crisisResources.vandrevala}
                </a>
              </div>
              <div className="p-3 bg-red-50 rounded">
                <p className="font-semibold">Emergency Services</p>
                <a href={`tel:${crisisResources.emergency}`} className="text-blue-600 text-lg">
                  {crisisResources.emergency}
                </a>
              </div>
            </div>
            <button
              onClick={() => setCrisisResources(null)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Chat Interface - takes remaining space */}
      <div className="flex-1 overflow-hidden">
        <StreamingChatInterface 
          sessionId={sessionId} 
          language="en"
          initialMessage={initialMessage}
          voiceState={voiceMode.voiceState}
          onVoiceToggle={handleVoiceToggle}
          isVoiceSupported={voiceMode.isVoiceSupported}
          voiceError={voiceMode.error}
        />
      </div>
    </div>
  );
};
