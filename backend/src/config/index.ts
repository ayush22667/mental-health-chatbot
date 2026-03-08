import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  },
  aws: {
    region: process.env.AWS_REGION || 'ap-south-1',
    accountId: process.env.AWS_ACCOUNT_ID || '',
  },
  dynamodb: {
    endpoint: process.env.DYNAMODB_ENDPOINT || undefined, // For local DynamoDB
    sessionsTable: process.env.DYNAMODB_SESSIONS_TABLE || 'mental-health-sessions',
    journalsTable: process.env.DYNAMODB_JOURNALS_TABLE || 'mental-health-journals',
    userPreferencesTable: process.env.DYNAMODB_USER_PREFERENCES_TABLE || 'mental-health-user-preferences',
  },
  s3: {
    contentBucket: process.env.S3_CONTENT_BUCKET || 'mental-health-content',
    logsBucket: process.env.S3_LOGS_BUCKET || 'mental-health-logs',
  },
  sagemaker: {
    riskClassifierEndpoint: process.env.SAGEMAKER_RISK_CLASSIFIER_ENDPOINT || 'risk-classifier-endpoint',
  },
  bedrock: {
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
    embeddingModelId: process.env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v1',
  },
  opensearch: {
    endpoint: process.env.OPENSEARCH_ENDPOINT || 'https://search-mental-health-knowledge-in7vkc4a3ogoct4qgvxazncdxq.us-east-1.es.amazonaws.com',
  },
  sns: {
    escalationTopicArn: process.env.SNS_ESCALATION_TOPIC_ARN || '',
  },
  sqs: {
    escalationQueueUrl: process.env.SQS_ESCALATION_QUEUE_URL || '',
  },
  rateLimit: {
    requestsPerHour: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_HOUR || '60', 10),
  },
  session: {
    timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30', 10),
    maxHistoryExchanges: parseInt(process.env.SESSION_MAX_HISTORY_EXCHANGES || '20', 10),
    dataRetentionDays: parseInt(process.env.SESSION_DATA_RETENTION_DAYS || '90', 10),
  },
  safety: {
    crisisThreshold: parseFloat(process.env.CRISIS_THRESHOLD || '0.7'),
    elevatedThreshold: parseFloat(process.env.ELEVATED_THRESHOLD || '0.3'),
    filterTimeoutMs: parseInt(process.env.SAFETY_FILTER_TIMEOUT_MS || '300', 10),
    riskClassificationTimeoutMs: parseInt(process.env.RISK_CLASSIFICATION_TIMEOUT_MS || '500', 10),
  },
  llm: {
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '300', 10),
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '2000', 10),
  },
  rag: {
    topK: parseInt(process.env.RAG_TOP_K || '3', 10),
    timeoutMs: parseInt(process.env.RAG_TIMEOUT_MS || '1000', 10),
  },
};
