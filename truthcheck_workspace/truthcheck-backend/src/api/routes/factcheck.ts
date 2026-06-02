import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../../shared/dynamo-client';
import { config } from '../../shared/config';
import { newId, nowIso } from '../../shared/ids';
import { HttpError } from '../../shared/response';
import { QueryRecord } from '../../shared/types';
import { factCheck } from '../../agent';

/**
 * Atomically record a spent payment nonce (the settlement tx hash). Returns
 * false if it was already used (replay). TTL auto-purges after 24h.
 */
export async function consumeNonce(nonce: string): Promise<boolean> {
  try {
    await docClient.send(
      new PutCommand({
        TableName: config.noncesTable,
        Item: { nonce, expiresAt: Math.floor(Date.now() / 1000) + 86400 },
        ConditionExpression: 'attribute_not_exists(nonce)',
      })
    );
    return true;
  } catch (err: any) {
    if (err?.name === 'ConditionalCheckFailedException') return false;
    throw err;
  }
}

export interface PaymentInfo {
  network?: string;
  txHash?: string;
  payer?: string;
}

/**
 * Run a fact-check and persist it. `payment` is attached once x402 settlement
 * has happened (Phase 3); it's optional so the agent works before payments.
 */
export async function runFactCheck(
  body: { claim?: string; url?: string },
  payment?: PaymentInfo
): Promise<QueryRecord> {
  const claim = body.claim?.trim();
  if (!claim) throw new HttpError(400, 'claim is required');
  if (claim.length > 2000) throw new HttpError(400, 'claim too long (max 2000 chars)');

  const result = await factCheck(claim);

  const record: QueryRecord = {
    queryId: newId(),
    entityType: 'query',
    claim,
    ...result,
    createdAt: nowIso(),
    paid: !!payment,
    network: payment?.network,
    txHash: payment?.txHash,
    payer: payment?.payer,
  };
  await docClient.send(new PutCommand({ TableName: config.queriesTable, Item: record }));
  return record;
}

/** Public: fetch a past fact-check by id (shareable result). */
export async function getFactCheck(queryId: string): Promise<QueryRecord> {
  const res = await docClient.send(
    new GetCommand({ TableName: config.queriesTable, Key: { queryId } })
  );
  const record = res.Item as QueryRecord | undefined;
  if (!record) throw new HttpError(404, 'Result not found');
  return record;
}
