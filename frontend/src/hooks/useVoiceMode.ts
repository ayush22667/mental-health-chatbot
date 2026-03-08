/**
 * useVoiceMode Hook
 * 
 * React hook for managing voice conversation mode.
 * Provides voice state and control methods to components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceModeManager } from '../voice/VoiceModeManager';
import { VoiceState, CrisisResources } from '../voice/interfaces';

interface UseVoiceModeOptions {
  sessionId: string;
  language?: 'en-IN' | 'hi-IN';
  onCrisisDetected?: (resources: CrisisResources) => void;
}

interface UseVoiceModeReturn {
  voiceState: VoiceState;
  isVoiceSupported: boolean;
  startConversation: () => Promise<void>;
  stopConversation: () => void;
  error: string | null;
}

export const useVoiceMode = (options: UseVoiceModeOptions): UseVoiceModeReturn => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const managerRef = useRef<VoiceModeManager | null>(null);

  // Check if voice is supported
  const isVoiceSupported = 
    typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices &&
    typeof MediaRecorder !== 'undefined' &&
    typeof WebSocket !== 'undefined';

  // Initialize voice manager
  useEffect(() => {
    if (!isVoiceSupported) {
      return;
    }

    managerRef.current = new VoiceModeManager({
      sessionId: options.sessionId,
      language: options.language || 'en-IN',
      onCrisisDetected: (resources) => {
        setError('Crisis detected. Please see emergency resources.');
        if (options.onCrisisDetected) {
          options.onCrisisDetected(resources);
        }
      },
      onError: (errorMessage) => {
        setError(errorMessage);
      },
    });

    // Subscribe to state changes
    managerRef.current.onStateChange((state) => {
      setVoiceState(state);
    });

    // Cleanup on unmount
    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }
    };
  }, [options.sessionId, options.language, isVoiceSupported]);

  // Start conversation
  const startConversation = useCallback(async () => {
    if (!managerRef.current) {
      setError('Voice mode not initialized');
      return;
    }

    try {
      setError(null);
      await managerRef.current.startConversation();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start voice conversation';
      setError(errorMessage);
      console.error('Failed to start voice conversation:', err);
    }
  }, []);

  // Stop conversation
  const stopConversation = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.stopConversation();
      setError(null);
    }
  }, []);

  return {
    voiceState,
    isVoiceSupported,
    startConversation,
    stopConversation,
    error,
  };
};
