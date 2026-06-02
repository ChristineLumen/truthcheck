import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { json, ok, notFound, paymentRequired, HttpError } from '../shared/response';
import { runFactCheck, getFactCheck, consumeNonce } from './routes/factcheck';
import { getPricing } from './routes/pricing';
import { buildRequirements, verifyAndSettle, X402_VERSION } from '../payment/x402';

function parseBody(event: APIGatewayProxyEvent): any {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const path = (event.path || '/').replace(/\/+$/, '') || '/';
  const segments = path.split('/').filter(Boolean);

  try {
    if (method === 'OPTIONS') return json(200, {});

    // GET /health
    if (method === 'GET' && path === '/health') {
      return ok({ status: 'ok', service: 'truthcheck' });
    }

    // GET /pricing
    if (method === 'GET' && path === '/pricing') {
      return ok(await getPricing());
    }

    // POST /factcheck  — x402-gated
    if (method === 'POST' && path === '/factcheck') {
      const xPayment =
        event.headers?.['X-PAYMENT'] || event.headers?.['x-payment'] || undefined;

      const host = event.headers?.Host || event.headers?.host || 'api';
      const stage = event.requestContext?.stage ? `/${event.requestContext.stage}` : '';
      const resourceUrl = `https://${host}${stage}/factcheck`;
      const requirements = await buildRequirements(resourceUrl);

      // No payment presented → 402 challenge with requirements.
      if (!xPayment) {
        return paymentRequired({
          x402Version: X402_VERSION,
          accepts: [requirements],
          error: 'X-PAYMENT header required',
        });
      }

      const settled = await verifyAndSettle(xPayment, requirements);
      if (!settled.paid) {
        return paymentRequired({
          x402Version: X402_VERSION,
          accepts: [requirements],
          error: 'Invalid or unsettled payment',
        });
      }

      // Replay guard: a settled on-chain tx can only buy one query.
      if (settled.txHash && !(await consumeNonce(settled.txHash))) {
        return json(409, { error: 'Payment already used' });
      }

      const record = await runFactCheck(parseBody(event), {
        network: settled.network,
        txHash: settled.txHash,
        payer: settled.payer,
      });
      const extraHeaders: Record<string, string> = {};
      if (settled.responseHeader) extraHeaders['X-PAYMENT-RESPONSE'] = settled.responseHeader;
      return ok(record, extraHeaders);
    }

    // GET /factcheck/{id}
    if (method === 'GET' && segments[0] === 'factcheck' && segments.length === 2) {
      return ok(await getFactCheck(segments[1]));
    }

    return notFound(`No route for ${method} ${path}`);
  } catch (err) {
    if (err instanceof HttpError) return json(err.statusCode, { error: err.message });
    console.error('Unhandled API error:', err);
    return json(500, { error: 'Internal server error' });
  }
};
