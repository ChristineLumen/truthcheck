export interface SiteConfig {
  /** Stable identifier, also passed as SITE_ID env var to the backend. */
  id: string;

  /** AWS region this site's stack deploys to. */
  region: string;

  /** Prefix for all AWS resource names (tables, lambdas, buckets). */
  resourcePrefix: string;

  /** SSM parameter namespace, e.g. "/truthcheck". */
  ssmPrefix: string;

  /**
   * Root domain. Empty string deploys in scaffold mode: the demo page is served
   * via the CloudFront default *.cloudfront.net domain and the API via its
   * default execute-api URL (no Route53 / ACM wiring).
   */
  rootDomain: string;

  /** API custom domain. Empty in scaffold mode. */
  apiDomain: string;

  /** Route53 hosted zone name. Empty when no custom domain yet. */
  hostedZoneName: string;

  /** CORS allowed origins for the API. ["*"] in scaffold mode. */
  corsOrigins: string[];

  /** x402 network for payments, e.g. "base-sepolia". */
  x402Network: string;

  /** Per-query price as a USD string, e.g. "$0.01". */
  price: string;
}
