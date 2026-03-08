/**
 * TopBar Component
 * Header with branding and online status indicator
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { LeafIcon } from './icons/LeafIcon';
import { signOut } from 'aws-amplify/auth';
import { isCognitoConfigured } from '../config/amplify';

export const TopBar: React.FC = () => {
  const isLoggedIn = !!localStorage.getItem('access_token');
  const userEmail = localStorage.getItem('user_email');

  const handleLogout = async () => {
    try {
      // Sign out from Cognito if configured
      if (isCognitoConfigured) {
        await signOut();
      }
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('id_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_email');
      window.location.href = '/login';
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-10 bg-[#f5f5f3]/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        {/* Left: Logo and Title */}
        <div className="flex items-center gap-3">
          <LeafIcon className="text-teal-600" size={28} />
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-gray-800 leading-tight">
              Calm Space
            </h1>
            <p className="text-xs text-gray-500 leading-tight">
              Your moment of peace
            </p>
          </div>
        </div>

        {/* Right: Auth Status */}
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <span className="text-xs text-gray-600 hidden sm:inline">
                {userEmail}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
            >
              Sign In
            </Link>
          )}
          
          <div 
            className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"
            aria-label="Online"
            role="status"
          />
        </div>
      </div>
    </header>
  );
};
