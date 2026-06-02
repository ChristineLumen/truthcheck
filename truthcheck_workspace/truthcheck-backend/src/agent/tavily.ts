import { getSecret } from '../shared/ssm';

export interface TavilyResult {
  title: string;
  url: string;
  content?: string;
  score?: number;
}

/**
 * Real-time web verification via Tavily. Returns null if no API key is
 * configured (so callers can fall back to a stub).
 */
export async function searchTavily(claim: string): Promise<TavilyResult[] | null> {
  const apiKey = await getSecret('tavily-api-key');
  if (!apiKey) return null;

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: claim,
      search_depth: 'advanced',
      include_answer: false,
      include_raw_content: false,
      max_results: 6,
    }),
  });
  if (!res.ok) {
    console.warn('Tavily search failed:', res.status, await res.text().catch(() => ''));
    return [];
  }
  const data = (await res.json()) as { results?: TavilyResult[] };
  return data.results || [];
}
