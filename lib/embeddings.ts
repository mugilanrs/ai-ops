import type { FeatureExtractionPipeline } from '@huggingface/transformers';

const MODEL = process.env.EMBEDDING_MODEL ?? 'Xenova/all-MiniLM-L6-v2';

// Singleton — model is downloaded once and cached in-process
let pipeline: FeatureExtractionPipeline | null = null;

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (pipeline) return pipeline;

  // Dynamic import keeps Transformers.js server-side only
  const { pipeline: createPipeline } = await import('@huggingface/transformers');
  pipeline = await createPipeline('feature-extraction', MODEL, {
    dtype: 'fp32',
  }) as FeatureExtractionPipeline;

  return pipeline;
}

/**
 * Returns a normalized 384-dim embedding vector for the given text.
 * Mean-pools the token embeddings then L2-normalises.
 */
export async function embed(text: string): Promise<number[]> {
  const pipe = await getPipeline();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  // output.data is a Float32Array
  return Array.from(output.data as Float32Array);
}

/** Convenience: embed `title + ' ' + description` */
export function incidentText(title: string, description: string): string {
  return `${title} ${description}`;
}
