/** Embeddings are disabled — @huggingface/transformers requires native ONNX binaries unavailable in serverless. */
export async function embed(_text: string): Promise<number[] | null> {
  return null;
}

export function incidentText(title: string, description: string): string {
  return `${title} ${description}`;
}
