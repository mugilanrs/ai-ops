import type { FeatureExtractionPipeline } from '@huggingface/transformers';

const MODEL = process.env.EMBEDDING_MODEL ?? 'Xenova/all-MiniLM-L6-v2';

let pipeline: FeatureExtractionPipeline | null = null;

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (pipeline) return pipeline;
  const { pipeline: createPipeline } = await import('@huggingface/transformers');
  pipeline = await createPipeline('feature-extraction', MODEL, { dtype: 'fp32' }) as FeatureExtractionPipeline;
  return pipeline;
}

/** Returns a normalized 384-dim embedding, or null if unavailable (e.g. serverless). */
export async function embed(text: string): Promise<number[] | null> {
  try {
    const pipe = await getPipeline();
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data as Float32Array);
  } catch {
    console.warn('[embeddings] model unavailable, skipping embedding');
    return null;
  }
}

/** Convenience: embed `title + ' ' + description` */
export function incidentText(title: string, description: string): string {
  return `${title} ${description}`;
}
