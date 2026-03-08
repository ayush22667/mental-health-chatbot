/**
 * Query Knowledge Base
 * Run with: OPENSEARCH_USERNAME=admin OPENSEARCH_PASSWORD=yourpass npx ts-node scripts/query-knowledge-base.ts "your query here"
 */

import { Client } from '@opensearch-project/opensearch';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from '../src/config';

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
  const query = process.argv[2] || 'I feel anxious';
  
  const username = process.env.OPENSEARCH_USERNAME;
  const password = process.env.OPENSEARCH_PASSWORD;

  if (!username || !password) {
    console.error('❌ Set OPENSEARCH_USERNAME and OPENSEARCH_PASSWORD');
    process.exit(1);
  }

  console.log('🔍 Querying Knowledge Base');
  console.log('==========================\n');
  console.log(`Query: "${query}"\n`);

  const client = new Client({
    node: config.opensearch.endpoint,
    auth: { username, password },
  });

  const bedrockClient = new BedrockRuntimeClient({
    region: config.aws.region,
  });

  try {
    // Get index stats
    const stats = await client.count({ index: 'mental-health-knowledge' });
    console.log(`📊 Total documents: ${stats.body.count}\n`);

    // Generate embedding and search
    console.log('🔄 Generating embedding...');
    const embedding = await generateEmbedding(query, bedrockClient);
    
    console.log('🔍 Searching...\n');
    const response = await client.search({
      index: 'mental-health-knowledge',
      body: {
        size: 5,
        query: {
          knn: {
            embedding: {
              vector: embedding,
              k: 5,
            },
          },
        },
      },
    });

    console.log('Top 5 Results:');
    console.log('==============\n');
    
    response.body.hits.hits.forEach((hit: any, i: number) => {
      console.log(`${i + 1}. ${hit._source.title}`);
      console.log(`   Score: ${hit._score.toFixed(4)}`);
      console.log(`   Category: ${hit._source.category}`);
      console.log(`   Language: ${hit._source.language || 'en'}`);
      console.log(`   Tags: ${hit._source.tags.join(', ')}`);
      console.log(`   Content: ${hit._source.content.substring(0, 150)}...`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Query failed:', error);
    process.exit(1);
  }
}

main();
