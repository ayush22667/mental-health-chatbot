import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Language } from '../models';
import { config } from '../config';

interface JournalEntry {
  userId: string;
  entryId: string;
  content: string;
  language: Language;
  wordCount: number;
  createdAt: string;
}

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: config.aws.region,
  ...(config.dynamodb.endpoint && { endpoint: config.dynamodb.endpoint }),
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

export class JournalService {

  /**
   * Create a new journal entry
   */
  async createEntry(params: {
    userId: string;
    content: string;
    language: Language;
  }): Promise<{ entryId: string; createdAt: Date }> {
    const wordCount = params.content.split(/\s+/).length;
    const entryId = uuidv4();
    const createdAt = new Date();

    const entry: JournalEntry = {
      userId: params.userId,
      entryId,
      content: params.content,
      language: params.language,
      wordCount,
      createdAt: createdAt.toISOString(),
    };

    // Store in DynamoDB
    await docClient.send(new PutCommand({
      TableName: config.dynamodb.journalsTable,
      Item: entry,
    }));

    console.log('Created journal entry for user:', params.userId);

    return {
      entryId,
      createdAt,
    };
  }

  /**
   * Get all journal entries for a user
   */
  async getEntries(userId: string): Promise<JournalEntry[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: config.dynamodb.journalsTable,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false, // Sort by createdAt descending
    }));

    return (result.Items || []) as JournalEntry[];
  }

  /**
   * Delete a journal entry
   */
  async deleteEntry(userId: string, entryId: string): Promise<void> {
    // Delete from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: config.dynamodb.journalsTable,
      Key: {
        userId,
        entryId,
      },
    }));

    console.log('Deleted journal entry:', entryId, 'for user:', userId);
  }

  /**
   * Export all journal entries as plain text
   */
  async exportEntries(userId: string): Promise<string> {
    const entries = await this.getEntries(userId);
    
    let exportText = 'Journal Export\n';
    exportText += '='.repeat(50) + '\n\n';
    
    for (const entry of entries) {
      if (!entry) continue;
      const date = new Date(entry.createdAt).toLocaleString();
      exportText += `Date: ${date}\n`;
      exportText += `Language: ${entry.language}\n`;
      exportText += '-'.repeat(50) + '\n';
      exportText += entry.content + '\n\n';
    }
    
    return exportText;
  }
}
