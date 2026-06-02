import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { config } from './config';

const ssm = new SSMClient({});
const cache = new Map<string, string>();

/**
 * Read a SecureString parameter under the site's SSM prefix, cached for the
 * lifetime of the Lambda container. `name` is the leaf, e.g. "tavily-api-key".
 * Returns '' if the parameter doesn't exist (so the stub phase works before
 * secrets are provisioned).
 */
export async function getSecret(name: string): Promise<string> {
  const key = `${config.ssmPrefix}/${name}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  try {
    const res = await ssm.send(
      new GetParameterCommand({ Name: key, WithDecryption: true })
    );
    const value = res.Parameter?.Value || '';
    cache.set(key, value);
    return value;
  } catch {
    cache.set(key, '');
    return '';
  }
}
