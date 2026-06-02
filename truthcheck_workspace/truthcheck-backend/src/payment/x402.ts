import { exact } from 'x402/schemes';
import {
  processPriceToAtomicAmount,
  getDefaultAsset,
} from 'x402/shared';
import { useFacilitator } from 'x402/verify';
import type {
  PaymentRequirements,
  PaymentPayload,
  Network,
} from 'x402/types';
import { config } from '../shared/config';
import { getSecret } from '../shared/ssm';

// Coinbase's public facilitator (handles verify+settle; testnet needs no keys).
const FACILITATOR_URL = 'https://x402.org/facilitator';
const X402_VERSION = 1;

export interface SettledPayment {
  paid: boolean;
  network: string;
  txHash?: string;
  payer?: string;
  /** Base64 X-PAYMENT-RESPONSE header value to return to the client. */
  responseHeader?: string;
  stub?: boolean;
}

/**
 * Build the PaymentRequirements advertised in a 402 response for POST /factcheck.
 * payTo comes from SSM; in stub mode (no payTo configured) we still return a
 * well-formed requirements object so clients/dev can see the shape.
 */
export async function buildRequirements(resourceUrl: string): Promise<PaymentRequirements> {
  const network = config.x402Network as Network;
  const payTo = (await getSecret('x402-pay-to-address')) ||
    '0x0000000000000000000000000000000000000000';

  const atomic = processPriceToAtomicAmount(config.price, network);
  if ('error' in atomic) {
    throw new Error(`x402 price error: ${atomic.error}`);
  }
  const { maxAmountRequired, asset } = atomic;
  // base-sepolia is an EVM network, so the asset carries eip712 domain info.
  const eip712 = 'eip712' in asset ? asset.eip712 : undefined;

  return {
    scheme: 'exact',
    network,
    maxAmountRequired,
    resource: resourceUrl as `${string}://${string}`,
    description: 'AI fact-check (one query)',
    mimeType: 'application/json',
    payTo,
    maxTimeoutSeconds: 120,
    asset: asset.address as string,
    extra: eip712,
  };
}

/** True once a real pay-to address has been provisioned in SSM. */
export async function paymentsEnabled(): Promise<boolean> {
  return !!(await getSecret('x402-pay-to-address'));
}

/**
 * Verify + settle an X-PAYMENT header against the facilitator. In stub mode
 * (payments not enabled) any non-empty header is accepted without touching the
 * chain, so the end-to-end UX works before wallets/keys exist.
 */
export async function verifyAndSettle(
  xPaymentHeader: string | undefined,
  requirements: PaymentRequirements
): Promise<SettledPayment> {
  const enabled = await paymentsEnabled();

  if (!enabled) {
    // Stub: accept a sentinel header so the demo flow completes off-chain.
    return { paid: true, network: requirements.network, stub: true, payer: 'stub' };
  }

  if (!xPaymentHeader) {
    return { paid: false, network: requirements.network };
  }

  let payload: PaymentPayload;
  try {
    payload = exact.evm.decodePayment(xPaymentHeader);
  } catch {
    return { paid: false, network: requirements.network };
  }

  const { verify, settle } = useFacilitator({ url: FACILITATOR_URL });

  const verification = await verify(payload, requirements);
  if (!verification.isValid) {
    return { paid: false, network: requirements.network };
  }

  const settlement = await settle(payload, requirements);
  if (!settlement.success) {
    return { paid: false, network: requirements.network };
  }

  const responseHeader = Buffer.from(
    JSON.stringify({
      success: true,
      transaction: settlement.transaction,
      network: settlement.network,
      payer: settlement.payer,
    })
  ).toString('base64');

  return {
    paid: true,
    network: settlement.network || requirements.network,
    txHash: settlement.transaction,
    payer: settlement.payer,
    responseHeader,
  };
}

export { X402_VERSION, getDefaultAsset };
