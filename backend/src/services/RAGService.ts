/**
 * RAG Service for Knowledge Base Retrieval
 * Uses AWS OpenSearch for vector search and Bedrock for embeddings
 */

import { Client } from '@opensearch-project/opensearch';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { config } from '../config';

interface KnowledgeDocument {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  score?: number;
}

export class RAGService {
  private opensearchClient: Client;
  private bedrockClient: BedrockRuntimeClient;
  private indexName = 'mental-health-knowledge';

  constructor() {
    // Initialize OpenSearch client with AWS Signature V4
    this.opensearchClient = new Client({
      ...AwsSigv4Signer({
        region: config.aws.region,
        service: 'es',
        getCredentials: () => {
          const credentialsProvider = defaultProvider();
          return credentialsProvider();
        },
      }),
      node: config.opensearch.endpoint,
    });

    // Initialize Bedrock client for embeddings
    this.bedrockClient = new BedrockRuntimeClient({
      region: config.aws.region,
    });
  }

  /**
   * Generate embedding for text using Bedrock Titan
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const command = new InvokeModelCommand({
      modelId: 'amazon.titan-embed-text-v1',
      contentType: 'application/json',
      body: JSON.stringify({
        inputText: text,
      }),
    });

    const response = await this.bedrockClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    
    return result.embedding;
  }

  /**
   * Search for relevant documents
   */
  async search(query: string, topK: number = 3): Promise<KnowledgeDocument[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Search using k-NN
      const response = await this.opensearchClient.search({
        index: this.indexName,
        body: {
          size: topK,
          query: {
            knn: {
              embedding: {
                vector: queryEmbedding,
                k: topK,
              },
            },
          },
        },
      });

      return response.body.hits.hits.map((hit: any) => ({
        ...hit._source,
        score: hit._score,
      }));
    } catch (error) {
      console.error('RAG search error:', error);
      return [];
    }
  }

  /**
   * Get context for RAG
   */
  async getContext(query: string): Promise<string> {
    const documents = await this.search(query, config.rag.topK);

    if (documents.length === 0) {
      return '';
    }

    // Format context
    const context = documents
      .map((doc, i) => `[${i + 1}] ${doc.title}\n${doc.content}`)
      .join('\n\n');

    return context;
  }

  /**
   * Check if RAG is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.opensearchClient.ping();
      return true;
    } catch {
      return false;
    }
  }
}

export const ragService = new RAGService();
