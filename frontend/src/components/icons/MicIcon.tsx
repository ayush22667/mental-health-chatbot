/**
 * MicIcon Component
 * Microphone icon with different states (idle, listening, processing)
 */

import React from 'react';

interface MicIconProps {
  size?: number;
  state?: 'idle' | 'listening' | 'processing' | 'error';
}

export const MicIcon: React.FC<MicIconProps> = ({ size = 20, state = 'idle' }) => {
  const getColor = () => {
    switch (state) {
      case 'listening':
        return 'currentColor'; // Will use parent color
      case 'processing':
        return 'currentColor';
      case 'error':
        return '#EF4444'; // red-500
      default:
        return 'currentColor';
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Microphone body */}
      <path
        d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z"
        fill={getColor()}
      />
      {/* Microphone stand */}
      <path
        d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H7V12C7 14.76 9.24 17 12 17C14.76 17 17 14.76 17 12V10H19Z"
        fill={getColor()}
      />
      <path
        d="M11 21H13V23H11V21Z"
        fill={getColor()}
      />
      <path
        d="M8 23H16V24H8V23Z"
        fill={getColor()}
      />
    </svg>
  );
};
