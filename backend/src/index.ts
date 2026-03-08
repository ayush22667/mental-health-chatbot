import express, { Express, Request, Response } from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';
import { initializeDatabase, checkDatabaseHealth } from './utils/db-init';

// Import routes
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import sessionRoutes from './routes/session';
import exerciseRoutes from './routes/exercise';
import journalRoutes from './routes/journal';
import streamRoutes from './routes/stream';
import voiceRoutes from './routes/voice';

const app: Express = express();

// Enable WebSocket support
const wsInstance = expressWs(app);
const wsApp = wsInstance.app;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}));
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());
app.use(requestLogger);
// app.use(rateLimiter); // Disabled for development

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const dbHealthy = await checkDatabaseHealth();
  
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: Date.now(),
    environment: config.server.nodeEnv,
    database: dbHealthy ? 'connected' : 'disconnected',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/voice', voiceRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database and start server
const PORT = config.server.port;

async function startServer() {
  try {
    // Initialize database (placeholder for DynamoDB)
    await initializeDatabase();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Mental Health Chat Assistant API running on port ${PORT}`);
      console.log(`📍 Environment: ${config.server.nodeEnv}`);
      console.log(`🌍 CORS enabled for: http://localhost:3001`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Continuing without database checks...');
    
    // Start server anyway
    app.listen(PORT, () => {
      console.log(`🚀 Mental Health Chat Assistant API running on port ${PORT} (degraded mode)`);
    });
  }
}

startServer();

export default app;
