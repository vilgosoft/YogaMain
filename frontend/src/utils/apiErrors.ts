import axios from 'axios';

/** First human-readable message from an API error response, or fallback. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { error?: { message?: string; fields?: Record<string, string> } }
      | undefined;
    const fieldErrors = data?.error?.fields;
    if (fieldErrors && typeof fieldErrors === 'object') {
      const first = Object.values(fieldErrors).find((v) => typeof v === 'string');
      if (first) return first;
    }
    const msg = data?.error?.message;
    if (msg) return msg;
  }
  return fallback;
}
