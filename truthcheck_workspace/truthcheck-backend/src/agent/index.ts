import { FactCheckResult } from '../shared/types';
import { searchTavily } from './tavily';
import { synthesize } from './synthesize';

/**
 * Run the fact-check agent: real-time web verification (Tavily) + LLM synthesis
 * (Claude). If API keys aren't provisioned yet (SSM empty), falls back to a
 * deterministic stub so the endpoint works end-to-end before keys exist.
 */
export async function factCheck(claim: string): Promise<FactCheckResult> {
  const results = await searchTavily(claim);
  if (!results) {
    return stubResult(claim);
  }
  const synthesized = await synthesize(claim, results);
  if (!synthesized) {
    // Tavily worked but no LLM key — return sources with an unverified rating.
    return {
      truthRating: 'UNVERIFIABLE',
      confidence: 0.3,
      summary:
        'Web sources were found but automated synthesis is unavailable. Review the sources below.',
      sources: results.slice(0, 4).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 200),
      })),
    };
  }
  return synthesized;
}

function stubResult(claim: string): FactCheckResult {
  return {
    truthRating: 'UNVERIFIABLE',
    confidence: 0.0,
    summary: `Stub response — API keys not configured yet. Claim received: "${claim.slice(
      0,
      160
    )}". Add Tavily + Anthropic keys to SSM to enable real fact-checking.`,
    sources: [],
  };
}
