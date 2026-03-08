/**
 * Authentication Service
 * 
 * Handles user registration, login, token verification
 * Supports both anonymous mode (MVP) and authenticated mode
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// In-memory storage (will be replaced with DynamoDB)
interface User {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
}

interface UserPreferences {
  userId: string;
  language: string;
  journalingEnabled: boolean;
}

const users = new Map<string, User>();
const usersByEmail = new Map<string, User>();
const preferences = new Map<string, UserPreferences>();

export class AuthService {

  /**
   * Register a new user
   */
  async register(params: {
    email: string;
    password: string;
    language?: string;
  }): Promise<{ userId: string; accessToken: string; message: string }> {
    try {
      // Check if user already exists
      if (usersByEmail.has(params.email)) {
        throw new AppError('User already exists', 400);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(params.password, 10);

      // Create user
      const userId = uuidv4();
      const user: User = {
        id: userId,
        email: params.email,
        password: hashedPassword,
        createdAt: new Date(),
      };

      users.set(userId, user);
      usersByEmail.set(params.email, user);

      // Create preferences
      preferences.set(userId, {
        userId,
        language: params.language || 'en',
        journalingEnabled: false,
      });

      // Generate JWT token
      const accessToken = this.generateToken(user.id, user.email);

      return {
        userId: user.id,
        accessToken,
        message: 'Registration successful',
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError(error.message || 'Registration failed', 400);
    }
  }

  /**
   * Login user and get JWT token
   */
  async login(params: {
    email: string;
    password: string;
  }): Promise<{
    accessToken: string;
    userId: string;
    expiresIn: string;
  }> {
    try {
      // Find user
      const user = usersByEmail.get(params.email);

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(params.password, user.password);

      if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401);
      }

      // Generate JWT token
      const accessToken = this.generateToken(user.id, user.email);

      return {
        accessToken,
        userId: user.id,
        expiresIn: JWT_EXPIRES_IN,
      };
    } catch (error: any) {
      console.error('Login error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Login failed', 401);
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<{
    userId: string;
    email: string;
    isValid: boolean;
  }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
      };

      // Verify user still exists
      const user = users.get(decoded.userId);

      if (!user) {
        return {
          userId: '',
          email: '',
          isValid: false,
        };
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
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
   * Generate JWT token
   */
  private generateToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = users.get(userId);
    if (!user) return null;

    return {
      ...user,
      preferences: preferences.get(userId),
    };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, prefs: any) {
    const existing = preferences.get(userId);
    if (!existing) {
      throw new Error('User preferences not found');
    }

    preferences.set(userId, {
      ...existing,
      ...prefs,
    });

    return preferences.get(userId);
  }
}
