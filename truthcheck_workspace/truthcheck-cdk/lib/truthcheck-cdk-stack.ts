import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { Database } from './database';
import { Api } from './api';
import { Website } from './website';
import { truthcheckSite } from './sites/truthcheck';

/**
 * Single-stack TruthCheck backend: DynamoDB (queries + spent nonces) +
 * API Gateway/Lambda fact-check agent + a CloudFront-hosted demo page.
 * Secrets (Tavily / Anthropic / x402 wallet) live in SSM under /truthcheck.
 */
export class TruthCheckStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const site = truthcheckSite;

    const database = new Database(this, 'Database', { site });
    new Api(this, 'Api', { database, site });
    new Website(this, 'Website', { site });
  }
}
