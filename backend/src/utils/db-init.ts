/**
 * Database Initialization Utilities
 * 
 * Checks DynamoDB connectivity and table existence
 */

import { DynamoDBClient, ListTablesCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { config } from '../config';

const dynamoClient = new DynamoDBClient({
  region: config.aws.region,
  ...(config.dynamodb.endpoint && { endpoint: config.dynamodb.endpoint }),
});

export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔍 Checking DynamoDB connectivity...');
    
    // Check if we can connect to DynamoDB
    const listResult = await dynamoClient.send(new ListTablesCommand({}));
    console.log(`✅ Connected to DynamoDB (${listResult.TableNames?.length || 0} tables found)`);
    
    // Check required tables
    const requiredTables = [
      config.dynamodb.sessionsTable,
      config.dynamodb.journalsTable,
      config.dynamodb.userPreferencesTable,
    ];
    
    for (const tableName of requiredTables) {
      try {
        const describeResult = await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
        const status = describeResult.Table?.TableStatus;
        console.log(`  ✅ Table ${tableName}: ${status}`);
      } catch (error: any) {
        if (error.name === 'ResourceNotFoundException') {
          console.warn(`  ⚠️  Table ${tableName} not found`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('✅ Database initialization check passed');
  } catch (error: any) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Simple connectivity check
    await dynamoClient.send(new ListTablesCommand({}));
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
