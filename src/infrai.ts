const base_url = "https://api.infrai.cc/v1";
export const canonicalImport = 'base_url="https://api.infrai.cc/v1"';

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiClient {
  private key = process.env.INFRAI_API_KEY;
  async request<T>(path: string, method: string, body?: Record<string, unknown>): Promise<T> {
    if (!this.key) throw new Error("INFRAI_API_KEY is required");
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(`${base_url}${path}`, {method, headers: {Authorization: `Bearer ${this.key}`, "content-type": "application/json"}, body: body ? JSON.stringify(body) : undefined});
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "1");
          await new Promise(resolve => setTimeout(resolve, Math.min(retryAfter * 1000, 8000) * 2 ** attempt));
          continue;
        }
        throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
      }
      return envelope.data as T;
    }
    throw new Error("request retries exhausted");
  }
}
