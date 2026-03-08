/**
 * Login Page
 * Optional authentication for users who want to save journal entries
 * Supports both AWS Cognito and JWT authentication
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeafIcon } from '../components/icons/LeafIcon';
import { signIn, signUp, confirmSignUp } from 'aws-amplify/auth';
import { isCognitoConfigured } from '../config/amplify';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [authMode, setAuthMode] = useState<'cognito' | 'jwt'>('jwt');

  useEffect(() => {
    // Detect auth mode on mount
    setAuthMode(isCognitoConfigured ? 'cognito' : 'jwt');
  }, []);

  const handleCognitoSignUp = async () => {
    try {
      const { isSignUpComplete, nextStep } = await signUp({
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email,
          },
          autoSignIn: true,
        },
      });

      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setNeedsConfirmation(true);
        setError('');
        return;
      }

      if (isSignUpComplete) {
        // Auto sign in
        await handleCognitoSignIn();
      }
    } catch (err: any) {
      console.error('Cognito signup error:', err);
      throw new Error(err.message || 'Signup failed');
    }
  };

  const handleCognitoSignIn = async () => {
    try {
      const { isSignedIn } = await signIn({
        username: email,
        password: password,
      });

      if (isSignedIn) {
        // Get tokens from Amplify
        const session = await import('aws-amplify/auth').then(m => m.fetchAuthSession());
        const accessToken = session.tokens?.accessToken?.toString();
        const idToken = session.tokens?.idToken?.toString();

        if (accessToken && idToken) {
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('id_token', idToken);
          localStorage.setItem('user_email', email);
          navigate('/');
        }
      }
    } catch (err: any) {
      console.error('Cognito signin error:', err);
      throw new Error(err.message || 'Login failed');
    }
  };

  const handleCognitoConfirmSignUp = async () => {
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username: email,
        confirmationCode: confirmationCode,
      });

      if (isSignUpComplete) {
        setNeedsConfirmation(false);
        setConfirmationCode('');
        // Auto sign in after confirmation
        await handleCognitoSignIn();
      }
    } catch (err: any) {
      console.error('Cognito confirm error:', err);
      throw new Error(err.message || 'Confirmation failed');
    }
  };

  const handleJWTAuth = async () => {
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = { email, password };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Authentication failed');
    }

    // Store tokens
    localStorage.setItem('access_token', data.data.accessToken);
    if (data.data.refreshToken) {
      localStorage.setItem('refresh_token', data.data.refreshToken);
    }
    localStorage.setItem('user_email', email);

    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'cognito') {
        if (isLogin) {
          await handleCognitoSignIn();
        } else {
          await handleCognitoSignUp();
        }
      } else {
        await handleJWTAuth();
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await handleCognitoConfirmSignUp();
    } catch (err: any) {
      setError(err.message || 'Confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  // Show confirmation code form if needed
  if (needsConfirmation && authMode === 'cognito') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f5f5f3] via-[#f8f8f6] to-[#f5f5f3] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <LeafIcon className="text-teal-600" size={48} />
            </div>
            <h1 className="text-3xl font-semibold text-gray-800 mb-2">
              Verify Your Email
            </h1>
            <p className="text-gray-600">
              We sent a verification code to {email}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <form onSubmit={handleConfirmCode} className="space-y-5">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter 6-digit code"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setNeedsConfirmation(false)}
                className="text-teal-600 hover:text-teal-700 text-sm font-medium"
              >
                Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f5f3] via-[#f8f8f6] to-[#f5f5f3] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LeafIcon className="text-teal-600" size={48} />
          </div>
          <h1 className="text-3xl font-semibold text-gray-800 mb-2">
            Calm Space
          </h1>
          <p className="text-gray-600">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </p>
          {authMode === 'cognito' && (
            <p className="text-xs text-teal-600 mt-1">
              Powered by AWS Cognito
            </p>
          )}
        </div>

        {/* Login/Signup Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="••••••••"
              />
              {!isLogin && (
                <p className="text-xs text-gray-500 mt-1">
                  Min 8 characters, include uppercase, lowercase, number, and symbol
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-500 text-white py-3 rounded-lg font-semibold hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-teal-600 hover:text-teal-700 text-sm font-medium"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* Skip Login */}
        <div className="mt-6 text-center">
          <button
            onClick={handleSkip}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            Continue without account →
          </button>
          <p className="text-xs text-gray-500 mt-2">
            You can chat anonymously without creating an account
          </p>
        </div>

        {/* Benefits of Account */}
        <div className="mt-8 bg-teal-50 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-teal-900 mb-3">
            Benefits of creating an account:
          </h3>
          <ul className="space-y-2 text-sm text-teal-800">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Save your journal entries securely</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Access conversation history across devices</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Personalized language and preferences</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Track your mental health journey over time</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
