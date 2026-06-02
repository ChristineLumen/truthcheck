export type TruthRating =
  | 'TRUE'
  | 'MOSTLY_TRUE'
  | 'MIXED'
  | 'MISLEADING'
  | 'FALSE'
  | 'UNVERIFIABLE';

export interface Source {
  title: string;
  url: string;
  snippet?: string;
}

export interface FactCheckResult {
  truthRating: TruthRating;
  confidence: number; // 0–1
  summary: string;
  sources: Source[];
}

export interface QueryRecord extends FactCheckResult {
  queryId: string;
  entityType: 'query'; // constant — powers the recent GSI
  claim: string;
  createdAt: string;
  // Payment metadata (populated once x402 is wired).
  paid?: boolean;
  network?: string;
  txHash?: string;
  payer?: string;
}
