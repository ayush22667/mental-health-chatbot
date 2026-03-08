/**
 * Leaf Icon Component
 * Simple, calming leaf icon for the mental health chat interface
 */

import React from 'react';

interface LeafIconProps {
  className?: string;
  size?: number;
}

export const LeafIcon: React.FC<LeafIconProps> = ({ 
  className = '', 
  size = 24 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2C12 2 5 5 5 12C5 15.866 8.13401 19 12 19C12 19 12 12 19 12C19 12 22 5 12 2Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M12 19C12 19 12 12 5 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
};
