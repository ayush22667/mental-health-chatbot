import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * Extended Request interface with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
    isAnonymous: boolean;
  };
}

/**
 * Optional authentication middleware
 * Allows both anonymous and authenticated users
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // Anonymous user - generate temporary ID from session or IP
    req.user = {
      userId: `anon-${req.ip || 'unknown'}`,
      isAnonymous: true,
    };
    return next();
  }

  try {
    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');

    // TODO: Verify JWT token with AWS Cognito
    // For now, decode without verification (placeholder)
    const decoded = decodeToken(token);

    req.user = {
      userId: decoded.sub,
      email: decoded.email,
      isAnonymous: false,
    };

    next();
  } catch (error) {
    // If token is invalid, treat as anonymous
    req.user = {
      userId: `anon-${req.ip || 'unknown'}`,
      isAnonymous: true,
    };
    next();
  }
};

/**
 * Required authentication middleware
 * Requires valid JWT token
 */
export const requireAuth = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const token = authHeader.replace('Bearer ', '');

    // TODO: Verify JWT token with AWS Cognito
    const decoded = decodeToken(token);

    req.user = {
      userId: decoded.sub,
      email: decoded.email,
      isAnonymous: false,
    };

    next();
  } catch (error) {
    throw new AppError('Invalid or expired token', 401);
  }
};

/**
 * Placeholder token decoder
 * TODO: Replace with AWS Cognito JWT verification
 */
function decodeToken(token: string): any {
  try {
    // This is a placeholder - in production, use AWS Cognito SDK
    // to verify the JWT signature and decode claims
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload);
  } catch (error) {
    throw new AppError('Invalid token', 401);
  }
}

/**
 * Check if user has access to resource
 */
export const checkResourceAccess = (
  req: AuthenticatedRequest,
  resourceUserId: string
): boolean => {
  if (!req.user) {
    return false;
  }

  // Anonymous users can't access other users' resources
  if (req.user.isAnonymous) {
    return false;
  }

  // User can only access their own resources
  return req.user.userId === resourceUserId;
};
