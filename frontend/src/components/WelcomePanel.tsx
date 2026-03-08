/**
 * WelcomePanel Component
 * Center hero section with welcome message and decorative icons
 */

import React from 'react';
import { LeafIcon } from './icons/LeafIcon';

const WELCOME_HEADING = 'Welcome to your calm space';
const WELCOME_DESCRIPTION = 
  "This is a safe place to unwind. Share what's on your mind, or simply enjoy the quiet. There's no rush here.";

export const WelcomePanel: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 animate-fadeIn">
      {/* Icon */}
      <div className="mb-6">
        <LeafIcon className="text-teal-500" size={48} />
      </div>

      {/* Heading */}
      <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-4 max-w-md">
        {WELCOME_HEADING}
      </h2>

      {/* Description */}
      <p className="text-base text-gray-600 leading-relaxed max-w-lg mb-8">
        {WELCOME_DESCRIPTION}
      </p>

      {/* Decorative Icons */}
      <div className="flex items-center gap-4 text-2xl opacity-70">
        <span role="img" aria-label="leaf">🌿</span>
        <span role="img" aria-label="wave">🌊</span>
        <span role="img" aria-label="cloud">☁️</span>
      </div>
    </div>
  );
};
