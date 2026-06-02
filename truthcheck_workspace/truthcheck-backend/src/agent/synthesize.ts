import Anthropic from '@anthropic-ai/sdk';
import { getSecret } from '../shared/ssm';
import { FactCheckResult, TruthRating } from '../shared/types';
import { TavilyResult } from './tavily';

const RATINGS: TruthRating[] = [
  'TRUE',
  'MOSTLY_TRUE',
  'MIXED',
  'MISLEADING',
  'FALSE',
  'UNVERIFIABLE',
];

const SYSTEM = `You are a rigorous fact-checking assistant. Given a CLAIM and a set of
real-time web SOURCES, assess the claim strictly from the evidence.

Respond with ONLY a JSON object (no markdown, no prose) of the form:
{
  "truthRating": one of ["TRUE","MOSTLY_TRUE","MIXED","MISLEADING","FALSE","UNVERIFIABLE"],
  "confidence": number between 0 and 1,
  "summary": "2-3 sentence explanation grounded in the sources",
  "sourceIndexes": [array of 0-based indexes of the sources you actually used, max 4]
}

Rules: Prefer UNVERIFIABLE when sources are weak or contradictory. Never invent
facts not present in the sources. Keep the summary neutral and specific.`;

/**
 * Synthesize a truth rating from web sources using Claude. Returns null if no
 * Anthropic key is configured.
 */
export async function synthesize(
  claim: string,
  results: TavilyResult[]
): Promise<FactCheckResult | null> {
  const apiKey = await getSecret('anthropic-api-key');
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const sourcesBlock = results
    .map((r, i) => `[${i}] ${r.title}\n${r.url}\n${(r.content || '').slice(0, 600)}`)
    .join('\n\n');

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 700,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `CLAIM: ${claim}\n\nSOURCES:\n${sourcesBlock}`,
      },
    ],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  const parsed = parseJson(text);
  if (!parsed) {
    return {
      truthRating: 'UNVERIFIABLE',
      confidence: 0.3,
      summary: 'Could not parse the synthesis. Review the sources below.',
      sources: results.slice(0, 4).map((r) => ({ title: r.title, url: r.url })),
    };
  }

  const rating: TruthRating = RATINGS.includes(parsed.truthRating)
    ? parsed.truthRating
    : 'UNVERIFIABLE';
  const idxs: number[] = Array.isArray(parsed.sourceIndexes)
    ? parsed.sourceIndexes
    : [];
  const chosen = idxs
    .map((i) => results[i])
    .filter(Boolean)
    .slice(0, 4);
  const sources = (chosen.length ? chosen : results.slice(0, 4)).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content?.slice(0, 200),
  }));

  return {
    truthRating: rating,
    confidence: clamp01(Number(parsed.confidence)),
    summary: String(parsed.summary || '').slice(0, 800),
    sources,
  };
}

function parseJson(text: string): any | null {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}
