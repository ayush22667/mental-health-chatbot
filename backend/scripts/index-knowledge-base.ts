/**
 * Index Knowledge Base into OpenSearch
 * Run with: npx ts-node scripts/index-knowledge-base.ts
 */

import { Client } from '@opensearch-project/opensearch';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../src/config';

// Setup logging
const logFile = path.join(__dirname, '../logs/opensearch-indexing.log');
const logDir = path.dirname(logFile);

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(message);
  logStream.write(logMessage + '\n');
  
  if (data) {
    const dataStr = JSON.stringify(data, null, 2);
    logStream.write(dataStr + '\n');
  }
  
  logStream.write('\n');
}

interface KnowledgeDocument {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
}

async function generateEmbedding(text: string, bedrockClient: BedrockRuntimeClient): Promise<number[]> {
  const command = new InvokeModelCommand({
    modelId: 'amazon.titan-embed-text-v1',
    contentType: 'application/json',
    body: JSON.stringify({
      inputText: text,
    }),
  });

  const response = await bedrockClient.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  
  return result.embedding;
}

async function main() {
  log('📚 Indexing Mental Health Knowledge Base');
  log('==========================================\n');

  // Get AWS credentials
  log('🔐 Getting AWS credentials...');
  const credentialsProvider = defaultProvider();
  const credentials = await credentialsProvider();
  
  log('✅ AWS Credentials obtained', {
    accessKeyId: credentials.accessKeyId.substring(0, 8) + '...',
    region: config.aws.region,
    endpoint: config.opensearch.endpoint,
  });

  // Initialize clients with AWS Signature V4
  log('\n📡 Initializing OpenSearch client with IAM authentication (AWS SigV4)...');
  const opensearchClient = new Client({
    ...AwsSigv4Signer({
      region: config.aws.region,
      service: 'es',
      getCredentials: () => credentialsProvider(),
    }),
    node: config.opensearch.endpoint,
  });
  log('✅ Client initialized\n');

  const bedrockClient = new BedrockRuntimeClient({
    region: config.aws.region,
  });

  const indexName = 'mental-health-knowledge';

  // Load documents
  const documentsPath = path.join(__dirname, '../knowledge-base/mental-health-content.json');
  const documents: KnowledgeDocument[] = JSON.parse(fs.readFileSync(documentsPath, 'utf-8'));

  log(`📄 Loaded ${documents.length} documents\n`);

  try {
    // Check if index exists
    log('📡 REQUEST: Check if index exists');
    const indexExists = await opensearchClient.indices.exists({ index: indexName });
    log('📥 RESPONSE: Index exists', { exists: indexExists.body });

    if (!indexExists.body) {
      log('🔧 Creating index...');
      log('📡 REQUEST: Create index with k-NN mappings');
      await opensearchClient.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: { type: 'text' },
              category: { type: 'keyword' },
              content: { type: 'text' },
              tags: { type: 'keyword' },
              embedding: {
                type: 'knn_vector',
                dimension: 1536,
              },
            },
          },
        },
      });
      log('📥 RESPONSE: Index created successfully\n');
    } else {
      log('✅ Index already exists\n');
    }

    // Index each document
    log('🔄 Indexing documents...\n');
    
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      log(`   [${i + 1}/${documents.length}] ${doc.title}`);

      try {
        // Generate embedding
        log(`📡 REQUEST: Generate embedding for doc ${doc.id}`);
        const embedding = await generateEmbedding(doc.content, bedrockClient);
        log(`📥 RESPONSE: Embedding generated (${embedding.length} dimensions)`);

        // Index document
        log(`📡 REQUEST: Index document ${doc.id}`);
        await opensearchClient.index({
          index: indexName,
          id: doc.id,
          body: {
            ...doc,
            embedding,
          },
          refresh: true,
        });
        log(`📥 RESPONSE: Document indexed successfully`);
      } catch (error: any) {
        log(`   ❌ Failed to index document ${doc.id}`, {
          message: error.message,
          statusCode: error.meta?.statusCode,
        });
        throw error;
      }
    }

    log('\n✅ All documents indexed successfully!');
    log('\n📊 Testing search...\n');

    // Test search
    const testQuery = 'I feel anxious';
    log(`📡 REQUEST: Generate test embedding for "${testQuery}"`);
    const testEmbedding = await generateEmbedding(testQuery, bedrockClient);
    log('📥 RESPONSE: Test embedding generated');

    log('📡 REQUEST: k-NN search');
    const searchResponse = await opensearchClient.search({
      index: indexName,
      body: {
        size: 3,
        query: {
          knn: {
            embedding: {
              vector: testEmbedding,
              k: 3,
            },
          },
        },
      },
    });
    log('📥 RESPONSE: Search completed');

    log(`Test query: "${testQuery}"`);
    log('Top results:');
    searchResponse.body.hits.hits.forEach((hit: any, i: number) => {
      log(`   ${i + 1}. ${hit._source.title} (score: ${hit._score.toFixed(4)})`);
    });

    log('\n✅ RAG setup complete!');
    log('\nNext steps:');
    log('1. Update ChatService to use RAGService');
    log('2. Test with: npm run dev');
    log('3. Send a message and verify RAG context is used');
    log(`\n📝 Full log saved to: ${logFile}`);
    logStream.end();
  } catch (error: any) {
    log('\n❌ Indexing failed', {
      message: error.message,
      statusCode: error.meta?.statusCode,
      body: error.meta?.body,
    });
    logStream.end();
    process.exit(1);
  }
}

main().catch((error) => {
  log('\n❌ Fatal error', {
    message: error.message,
    stack: error.stack,
  });
  logStream.end();
  process.exit(1);
});
