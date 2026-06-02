// Resource names + settings injected by the CDK Api construct. Fallbacks match
// the `truthcheck` resourcePrefix for local reference.
export const config = {
  queriesTable: process.env.QUERIES_TABLE_NAME || 'truthcheck-queries',
  noncesTable: process.env.NONCES_TABLE_NAME || 'truthcheck-nonces',
  ssmPrefix: process.env.SSM_PREFIX || '/truthcheck',
  x402Network: process.env.X402_NETWORK || 'base-sepolia',
  price: process.env.PRICE || '$0.01',
  region: process.env.AWS_REGION || 'eu-central-1',
};

// Constant partition value for the "recent fact-checks" GSI.
export const RECENT_BUCKET = 'query';
