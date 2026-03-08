/**
 * Bulk Index Knowledge Base into OpenSearch (MUCH FASTER)
 * Run with: npx ts-node scripts/bulk-index-knowledge-base.ts
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
    console.log(dataStr);
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
  log('📚 Bulk Indexing Mental Health Knowledge Base');
  log('==============================================\n');

  // Get AWS credentials
  log('🔐 Getting AWS credentials...');
  const credentialsProvider = defaultProvider();
  const credentials = await credentialsProvider();
  
  log('✅ AWS Credentials obtained', {
    accessKeyId: credentials.accessKeyId.substring(0, 8) + '...',
    region: config.aws.region,
    endpoint: config.opensearch.endpoint,
  });

  // Initialize OpenSearch client with AWS Signature V4
  log('\n📡 Initializing OpenSearch client with IAM authentication...');
  const opensearchClient = new Client({
    ...AwsSigv4Signer({
      region: config.aws.region,
      service: 'es',
      getCredentials: () => credentialsProvider(),
    }),
    node: config.opensearch.endpoint,
  });
  log('✅ Client initialized with AWS SigV4\n');

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
    log('📥 RESPONSE: Index exists check', { exists: indexExists.body });

    if (!indexExists.body) {
      log('🔧 Creating index...');
      log('📡 REQUEST: Create index', {
        index: indexName,
        settings: { knn: true },
        mappings: 'knn_vector with dimension 1536',
      });
      
      await opensearchClient.indices.create({
        index: indexName,
        body: {
          settings: {
            index: {
              knn: true,
            },
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: { type: 'text' },
              category: { type: 'keyword' },
              content: { type: 'text' },
              tags: { type: 'keyword' },
              language: { type: 'keyword' },
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

    // Generate embeddings in batches
    log('🔄 Generating embeddings (this will take a few minutes)...\n');
    const batchSize = 10;
    const documentsWithEmbeddings: Array<KnowledgeDocument & { embedding: number[] }> = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, Math.min(i + batchSize, documents.length));
      
      log(`   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)} (docs ${i + 1}-${Math.min(i + batchSize, documents.length)})`);
      log(`📡 REQUEST: Generate ${batch.length} embeddings via Bedrock`);

      const embeddingPromises = batch.map(doc => generateEmbedding(doc.content, bedrockClient));
      const embeddings = await Promise.all(embeddingPromises);
      
      log(`� RESPONSE: Received ${embeddings.length} embeddings`);

      batch.forEach((doc, idx) => {
        documentsWithEmbeddings.push({
          ...doc,
          embedding: embeddings[idx],
        });
      });
    }

    log('\n✅ All embeddings generated!');
    log('\n🔄 Bulk indexing documents...\n');

    // Bulk index in chunks
    const bulkSize = 100;
    for (let i = 0; i < documentsWithEmbeddings.length; i += bulkSize) {
      const chunk = documentsWithEmbeddings.slice(i, Math.min(i + bulkSize, documentsWithEmbeddings.length));
      
      const body = chunk.flatMap(doc => [
        { index: { _index: indexName, _id: doc.id } },
        doc,
      ]);

      log(`� REQUEST: Bulk index ${chunk.length} documents (${i + 1}-${Math.min(i + bulkSize, documentsWithEmbeddings.length)})`);
      const bulkResponse = await opensearchClient.bulk({ body, refresh: false });
      log(`📥 RESPONSE: Bulk index completed`, {
        errors: bulkResponse.body.errors,
        took: bulkResponse.body.took,
        items: bulkResponse.body.items.length,
      });
      
      log(`   Indexed ${Math.min(i + bulkSize, documentsWithEmbeddings.length)}/${documentsWithEmbeddings.length} documents`);
    }

    // Refresh index
    log('\n📡 REQUEST: Refresh index');
    await opensearchClient.indices.refresh({ index: indexName });
    log('📥 RESPONSE: Index refreshed');

    log('\n✅ All documents indexed successfully!');
    log('\n📊 Testing search...\n');

    // Test search
    const testQuery = 'I feel anxious';
    log(`📡 REQUEST: Generate embedding for test query: "${testQuery}"`);
    const testEmbedding = await generateEmbedding(testQuery, bedrockClient);
    log('📥 RESPONSE: Test embedding generated');

    log('📡 REQUEST: k-NN search with k=3');
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
    const totalHits = typeof searchResponse.body.hits.total === 'number' 
      ? searchResponse.body.hits.total 
      : searchResponse.body.hits.total?.value || 0;
    
    log('📥 RESPONSE: Search completed', {
      hits: totalHits,
      took: searchResponse.body.took,
    });

    log(`Test query: "${testQuery}"`);
    log('Top results:');
    searchResponse.body.hits.hits.forEach((hit: any, i: number) => {
      log(`   ${i + 1}. ${hit._source.title} (score: ${hit._score.toFixed(4)})`);
    });

    log('\n✅ RAG setup complete!');
    log(`\n📝 Full log saved to: ${logFile}`);
    logStream.end();
  } catch (error: any) {
    log('\n❌ Indexing failed:', {
      message: error.message,
      statusCode: error.meta?.statusCode,
      body: error.meta?.body,
    });
    logStream.end();
    process.exit(1);
  }
}

main().catch((error) => {
  log('\n❌ Fatal error:', {
    message: error.message,
    stack: error.stack,
  });
  logStream.end();
  process.exit(1);
});
