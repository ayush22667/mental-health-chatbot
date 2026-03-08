/**
 * AWS Amplify Configuration
 * 
 * Configures AWS Cognito for authentication
 * Falls back to backend JWT if Cognito not configured
 */

import { Amplify } from 'aws-amplify';

const COGNITO_USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';
const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'ap-south-1';

export const isCognitoConfigured = !!(COGNITO_USER_POOL_ID && COGNITO_CLIENT_ID);

if (isCognitoConfigured) {
  // Configure Amplify with Cognito
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: COGNITO_USER_POOL_ID,
        userPoolClientId: COGNITO_CLIENT_ID,
        loginWith: {
          email: true,
        },
        signUpVerificationMethod: 'code',
        userAttributes: {
          email: {
            required: true,
          },
        },
        allowGuestAccess: true,
        passwordFormat: {
          minLength: 8,
          requireLowercase: true,
          requireUppercase: true,
          requireNumbers: true,
          requireSpecialCharacters: true,
        },
      },
    },
  });

  console.log('✅ AWS Amplify configured with Cognito');
} else {
  console.log('⚠️  Cognito not configured, using backend JWT authentication');
}

export const amplifyConfig = {
  userPoolId: COGNITO_USER_POOL_ID,
  clientId: COGNITO_CLIENT_ID,
  region: AWS_REGION,
  configured: isCognitoConfigured,
};
