import { Router } from 'express';
import { cognitoAuthService } from '../services/CognitoAuthService';

const router = Router();

console.log('🔐 Authentication mode: AWS Cognito');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
    }

    console.log('📝 Registration request:', { email, hasPassword: !!password });

    const result = await cognitoAuthService.register({
      email,
      password,
    });

    res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login and get tokens
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
    }

    const tokens = await cognitoAuthService.login({
      email,
      password,
    });

    res.json({
      status: 'success',
      data: {
        accessToken: tokens.accessToken,
        idToken: tokens.idToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/verify
 * Verify token
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { token } = req.body;
    const authHeader = req.headers.authorization;
    const accessToken = token || authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is required',
      });
    }

    const result = await cognitoAuthService.verifyToken(accessToken);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/forgot-password
 * Initiate password reset
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required',
      });
    }

    const result = await cognitoAuthService.forgotPassword(email);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/reset-password
 * Confirm password reset with code
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Email, code, and new password are required',
      });
    }

    const result = await cognitoAuthService.confirmForgotPassword({
      email,
      code,
      newPassword,
    });

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/signout
 * Sign out user (invalidate tokens)
 */
router.post('/signout', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Access token is required',
      });
    }

    const result = await cognitoAuthService.signOut(accessToken);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token is required',
      });
    }

    const user = await cognitoAuthService.getUserFromToken(accessToken);

    res.json({
      status: 'success',
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
