import { config } from '../../shared/config';
import { getSecret } from '../../shared/ssm';

/**
 * Public pricing/payment info so clients can show the fee and (later) build the
 * x402 payment. payTo is read from SSM; empty until provisioned.
 */
export async function getPricing(): Promise<{
  price: string;
  network: string;
  asset: string;
  payTo: string;
}> {
  const payTo = await getSecret('x402-pay-to-address');
  return {
    price: config.price,
    network: config.x402Network,
    asset: 'USDC',
    payTo,
  };
}
