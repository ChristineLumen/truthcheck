import { APIGatewayProxyResult } from 'aws-lambda';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-PAYMENT',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  // Let browsers read the x402 settlement header.
  'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
  'Content-Type': 'application/json',
};

export function json(
  statusCode: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, ...extraHeaders },
    body: JSON.stringify(body),
  };
}

export const ok = (body: unknown, extraHeaders?: Record<string, string>) =>
  json(200, body, extraHeaders);
export const created = (body: unknown) => json(201, body);
export const badRequest = (message: string) => json(400, { error: message });
export const notFound = (message = 'Not found') => json(404, { error: message });

/** HTTP 402 Payment Required, with the x402 PaymentRequirements as the body. */
export const paymentRequired = (requirements: unknown) => json(402, requirements);

/** Thrown by route code to short-circuit with a specific status. */
export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}
