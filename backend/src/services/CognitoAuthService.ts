/**
 * AWS Cognito Authentication Service
 * 
 * Handles user registration, login, token verification using AWS Cognito
 * Replaces in-memory JWT authentication with production-ready Cognito
 */

import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
  AdminConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GlobalSignOutCommand,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { AppError } from '../middleware/errorHandler';

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || '';
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || '';

export class CognitoAuthService {
  private cognitoClient: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;

  constructor() {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: AWS_REGION,
    });
    this.userPoolId = COGNITO_USER_POOL_ID;
    this.clientId = COGNITO_CLIENT_ID;

    if (!this.userPoolId || !this.clientId) {
      throw new Error('Cognito credentials not configured. Set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID in environment variables.');
    }
  }

  /**
   * Register a new user with AWS Cognito
   */
  async register(params: {
    email: string;
    password: string;
  }): Promise<{
    userId: string;
    message: string;
    userConfirmed: boolean;
  }> {
    try {
      const command = new SignUpCommand({
        ClientId: this.clientId,
        Username: params.email,
        Password: params.password,
        UserAttributes: [
          {
            Name: 'email',
            Value: params.email,
          },
        ],
      });

      const response = await this.cognitoClient.send(command);

      return {
        userId: response.UserSub || '',
        message: 'Registration successful. Please check your email to verify your account.',
        userConfirmed: response.UserConfirmed || false,
      };
    } catch (error: any) {
      console.error('Cognito registration error:', error);
      
      if (error.name === 'UsernameExistsException') {
        throw new AppError('User already exists', 400);
      }
      if (error.name === 'InvalidPasswordException') {
        throw new AppError('Password does not meet requirements', 400);
      }
      if (error.name === 'InvalidParameterException') {
        throw new AppError('Invalid email or password format', 400);
      }
      
      throw new AppError(error.message || 'Registration failed', 400);
    }
  }

  /**
   * Login user and get Cognito tokens
   */
  async login(params: {
    email: string;
    password: string;
  }): Promise<{
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    try {
      const command = new InitiateAuthCommand({
        ClientId: this.clientId,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: params.email,
          PASSWORD: params.password,
        },
      });

      const response = await this.cognitoClient.send(command);

      if (!response.AuthenticationResult) {
        throw new AppError('Authentication failed', 401);
      }

      return {
        accessToken: response.AuthenticationResult.AccessToken || '',
        idToken: response.AuthenticationResult.IdToken || '',
        refreshToken: response.AuthenticationResult.RefreshToken || '',
        expiresIn: response.AuthenticationResult.ExpiresIn || 3600,
      };
    } catch (error: any) {
      console.error('Cognito login error:', error);
      
      if (error.name === 'NotAuthorizedException') {
        throw new AppError('Invalid email or password', 401);
      }
      if (error.name === 'UserNotConfirmedException') {
        throw new AppError('Please verify your email before logging in', 401);
      }
      if (error.name === 'UserNotFoundException') {
        throw new AppError('User not found', 401);
      }
      
      throw new AppError(error.message || 'Login failed', 401);
    }
  }

  /**
   * Get user details from access token
   */
  async getUserFromToken(accessToken: string): Promise<{
    userId: string;
    email: string;
    emailVerified: boolean;
    language: string;
  }> {
    try {
      const command = new GetUserCommand({
        AccessToken: accessToken,
      });

      const response = await this.cognitoClient.send(command);

      const email = response.UserAttributes?.find(attr => attr.Name === 'email')?.Value || '';
      const emailVerified = response.UserAttributes?.find(attr => attr.Name === 'email_verified')?.Value === 'true';

      return {
        userId: response.Username || '',
        email,
        emailVerified,
        language: 'en', // Default language since custom attribute not configured
      };
    } catch (error: any) {
      console.error('Get user error:', error);
      throw new AppError('Invalid or expired token', 401);
    }
  }

  /**
   * Verify access token (for middleware)
   */
  async verifyToken(accessToken: string): Promise<{
    userId: string;
    email: string;
    isValid: boolean;
  }> {
    try {
      const user = await this.getUserFromToken(accessToken);
      return {
        userId: user.userId,
        email: user.email,
        isValid: true,
      };
    } catch (error) {
      return {
        userId: '',
        email: '',
        isValid: false,
      };
    }
  }

  /**
   * Admin: Confirm user signup (for testing/admin purposes)
   */
  async adminConfirmSignUp(email: string): Promise<void> {
    try {
      const command = new AdminConfirmSignUpCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      console.error('Admin confirm signup error:', error);
      throw new AppError('Failed to confirm user', 500);
    }
  }

  /**
   * Initiate forgot password flow
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: this.clientId,
        Username: email,
      });

      await this.cognitoClient.send(command);

      return {
        message: 'Password reset code sent to your email',
      };
    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      if (error.name === 'UserNotFoundException') {
        // Don't reveal if user exists
        return {
          message: 'If the email exists, a reset code has been sent',
        };
      }
      
      throw new AppError('Failed to initiate password reset', 500);
    }
  }

  /**
   * Confirm forgot password with code
   */
  async confirmForgotPassword(params: {
    email: string;
    code: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.clientId,
        Username: params.email,
        ConfirmationCode: params.code,
        Password: params.newPassword,
      });

      await this.cognitoClient.send(command);

      return {
        message: 'Password reset successful',
      };
    } catch (error: any) {
      console.error('Confirm forgot password error:', error);
      
      if (error.name === 'CodeMismatchException') {
        throw new AppError('Invalid verification code', 400);
      }
      if (error.name === 'ExpiredCodeException') {
        throw new AppError('Verification code expired', 400);
      }
      
      throw new AppError('Failed to reset password', 500);
    }
  }

  /**
   * Sign out user globally (invalidate all tokens)
   */
  async signOut(accessToken: string): Promise<{ message: string }> {
    try {
      const command = new GlobalSignOutCommand({
        AccessToken: accessToken,
      });

      await this.cognitoClient.send(command);

      return {
        message: 'Signed out successfully',
      };
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new AppError('Failed to sign out', 500);
    }
  }

  /**
   * Get user by ID (admin operation)
   */
  async getUserById(userId: string): Promise<any> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: userId,
      });

      const response = await this.cognitoClient.send(command);

      const email = response.UserAttributes?.find(attr => attr.Name === 'email')?.Value || '';

      return {
        id: response.Username,
        email,
        language: 'en', // Default language since custom attribute not configured
        enabled: response.Enabled,
        status: response.UserStatus,
        createdAt: response.UserCreateDate,
      };
    } catch (error: any) {
      console.error('Get user by ID error:', error);
      return null;
    }
  }
}

// Singleton instance
export const cognitoAuthService = new CognitoAuthService();
