import { SiteConfig } from '../site-config';

// Primary TruthCheck site. Deploys to eu-central-1 (Frankfurt). Scaffold mode
// (no custom domain) until a real domain is registered. Payments run on the
// Base Sepolia testnet so the x402 loop is real but uses free testnet USDC.
export const truthcheckSite: SiteConfig = {
  id: 'truthcheck',
  region: 'eu-central-1',
  resourcePrefix: 'truthcheck',
  ssmPrefix: '/truthcheck',
  rootDomain: '',
  apiDomain: '',
  hostedZoneName: '',
  corsOrigins: ['*'],
  x402Network: 'base-sepolia',
  price: '$0.01',
};
