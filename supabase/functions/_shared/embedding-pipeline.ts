// Batch embedding pipeline: chunking → vectorization → upsert
import OpenAI from 'https://esm.sh/openai@4.77.0';
import { chunkText, contentHash } from './anti-block.ts';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 20; // OpenAI embedding batch limit

interface EmbeddingInput {
  content: string;
  metadata: Record<string, unknown>;
  source_type: string;
  region?: string;
}

interface EmbeddingRecord {
  content: string;
  content_hash: string;
  metadata: Record<string, unknown>;
  embedding: string; // JSON-stringified vector
  source_type: string;
  region: string | null;
  freshness_score: number;
  is_active: boolean;
  updated_at: string;
}

/**
 * Process raw content into chunked, embedded records ready for DB upsert
 */
export async function processContent(
  openai: OpenAI,
  inputs: EmbeddingInput[]
): Promise<EmbeddingRecord[]> {
  const records: EmbeddingRecord[] = [];

  // Step 1: Chunk all content
  const chunks: Array<{ text: string; meta: Record<string, unknown>; source: string; region?: string }> = [];

  for (const input of inputs) {
    const textChunks = chunkText(input.content);
    for (let i = 0; i < textChunks.length; i++) {
      chunks.push({
        text: textChunks[i],
        meta: {
          ...input.metadata,
          chunk_index: i,
          total_chunks: textChunks.length,
        },
        source: input.source_type,
        region: input.region,
      });
    }
  }

  // Step 2: Generate embeddings in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);

    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
      });

      // Step 3: Build records with hashes
      for (let j = 0; j < batch.length; j++) {
        const hash = await contentHash(batch[j].text);

        records.push({
          content: batch[j].text,
          content_hash: hash,
          metadata: batch[j].meta,
          embedding: JSON.stringify(response.data[j].embedding),
          source_type: batch[j].source,
          region: batch[j].region || null,
          freshness_score: 1.0,
          is_active: true,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(`Embedding batch ${i / BATCH_SIZE + 1} failed:`, error);
      // Continue with next batch
    }

    // Brief delay between batches to avoid rate limits
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return records;
}

/**
 * Update freshness scores for existing embeddings
 * Older data gets lower scores (exponential decay)
 */
export function calculateFreshnessScore(
  createdAt: Date,
  halfLifeDays: number = 90
): number {
  const now = new Date();
  const ageDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-0.693 * (ageDays / halfLifeDays)); // ln(2) ≈ 0.693
}
