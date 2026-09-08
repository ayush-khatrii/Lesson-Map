export class AiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number,
    public newRequest = false,
  ) {
    super(message);
    this.name = "AiError";
  }
}

// Enforce an actual byte limit, including requests without Content-Length.
export async function readLimitedJson(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
) {
  if (!body) throw new AiError(400, "A JSON body is required.");
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new AiError(413, "The request or response is too large.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new AiError(400, "Invalid JSON.");
    }
  } finally {
    reader.releaseLock();
  }
}
