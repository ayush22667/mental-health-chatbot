import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ConversationMode, RiskLevel, Language, Message } from '../models';
import { config } from '../config';

interface SessionData {
  sessionId: string;
  userId?: string;
  language: Language;
  mode: ConversationMode;
  riskLevel: RiskLevel;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  totalMessages: number;
  exercisesCompleted: string[];
  messages: Message[];
  riskEvents: Array<{
    riskLevel: RiskLevel;
    riskScore: number;
    triggeredBy: string;
    timestamp: number;
  }>;
}

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: config.aws.region,
  ...(config.dynamodb.endpoint && { endpoint: config.dynamodb.endpoint }),
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

export class SessionService {
  /**
   * Create a new session
   */
  async createSession(params: {
    userId?: string;
    language: Language;
    preferences?: any;
  }): Promise<{ sessionId: string; expiresAt: Date }> {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + config.session.timeoutMinutes * 60 * 1000);
    const now = new Date();

    const session = {
      sessionId,
      userId: params.userId,
      language: params.language,
      mode: ConversationMode.EmotionalSupport,
      riskLevel: RiskLevel.Normal,
      expiresAt,
      createdAt: now,
      updatedAt: now,
      totalMessages: 0,
      exercisesCompleted: [],
      messages: [],
      riskEvents: [],
    };

    // Store in DynamoDB
    await docClient.send(new PutCommand({
      TableName: config.dynamodb.sessionsTable,
      Item: {
        sessionId,
        userId: params.userId,
        language: params.language,
        mode: ConversationMode.EmotionalSupport,
        riskLevel: RiskLevel.Normal,
        expiresAt: expiresAt.toISOString(),
        createdAt: now.getTime(), // Store as timestamp number for GSI
        updatedAt: now.toISOString(),
        totalMessages: 0,
        exercisesCompleted: [],
        messages: [],
        riskEvents: [],
        ttl: Math.floor(expiresAt.getTime() / 1000), // TTL in seconds
      },
    }));

    console.log('Created session:', {
      sessionId,
      expiresAt: expiresAt.toISOString(),
      timeoutMinutes: config.session.timeoutMinutes,
    });

    return {
      sessionId,
      expiresAt,
    };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionData | undefined> {
    const result = await docClient.send(new GetCommand({
      TableName: config.dynamodb.sessionsTable,
      Key: { sessionId },
    }));

    if (!result.Item) {
      return undefined;
    }

    // Convert stored values back to Date objects
    return {
      ...result.Item,
      expiresAt: new Date(result.Item.expiresAt),
      createdAt: new Date(result.Item.createdAt), // createdAt is stored as number timestamp
      updatedAt: new Date(result.Item.updatedAt),
    } as SessionData;
  }

  /**
   * Get conversation history
   */
  async getHistory(sessionId: string): Promise<{
    messages: any[];
    sessionMetadata: any;
  }> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return {
        messages: [],
        sessionMetadata: {},
      };
    }

    return {
      messages: session.messages,
      sessionMetadata: {
        totalMessages: session.totalMessages,
        exercisesCompleted: session.exercisesCompleted,
        riskLevel: session.riskLevel,
      },
    };
  }

  /**
   * Add message to session
   */
  async addMessage(
    sessionId: string,
    message: Message
  ): Promise<void> {
    const session = await this.getSession(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    session.messages.push(message);
    session.totalMessages++;
    session.updatedAt = new Date();

    // Update in DynamoDB
    await docClient.send(new UpdateCommand({
      TableName: config.dynamodb.sessionsTable,
      Key: { sessionId },
      UpdateExpression: 'SET messages = :messages, totalMessages = :totalMessages, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':messages': session.messages,
        ':totalMessages': session.totalMessages,
        ':updatedAt': session.updatedAt.toISOString(),
      },
    }));
  }

  /**
   * Update session risk level
   */
  async updateRiskLevel(
    sessionId: string,
    riskLevel: RiskLevel,
    riskScore: number
  ): Promise<void> {
    const session = await this.getSession(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    session.riskLevel = riskLevel;
    session.updatedAt = new Date();
    
    const riskEvent = {
      riskLevel,
      riskScore,
      triggeredBy: 'safety_service',
      timestamp: Date.now(),
    };
    
    session.riskEvents.push(riskEvent);

    // Update in DynamoDB
    await docClient.send(new UpdateCommand({
      TableName: config.dynamodb.sessionsTable,
      Key: { sessionId },
      UpdateExpression: 'SET riskLevel = :riskLevel, riskEvents = :riskEvents, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':riskLevel': riskLevel,
        ':riskEvents': session.riskEvents,
        ':updatedAt': session.updatedAt.toISOString(),
      },
    }));
  }

  /**
   * End session
   */
  async endSession(
    sessionId: string,
    saveInsights: boolean
  ): Promise<void> {
    // TODO: If saveInsights and journaling enabled, prompt to save
    console.log('Ending session:', sessionId, 'saveInsights:', saveInsights);
    
    const now = new Date();
    
    // Update in DynamoDB
    await docClient.send(new UpdateCommand({
      TableName: config.dynamodb.sessionsTable,
      Key: { sessionId },
      UpdateExpression: 'SET expiresAt = :expiresAt, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':expiresAt': now.toISOString(),
        ':updatedAt': now.toISOString(),
      },
    }));
  }

  /**
   * Check if session is active
   */
  async isActive(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);

    if (!session) {
      console.log('Session not found:', sessionId);
      return false;
    }

    const now = new Date();
    const isActive = session.expiresAt > now;
    
    console.log('Session check:', {
      sessionId,
      expiresAt: session.expiresAt.toISOString(),
      now: now.toISOString(),
      isActive,
      timeUntilExpiry: session.expiresAt.getTime() - now.getTime(),
    });

    return isActive;
  }
}
