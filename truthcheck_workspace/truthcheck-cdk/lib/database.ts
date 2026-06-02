import * as cdk from 'aws-cdk-lib/core';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { SiteConfig } from './site-config';

interface DatabaseProps {
  site: SiteConfig;
}

/**
 * DynamoDB tables for TruthCheck.
 * - queries: one row per fact-check (claim, rating, sources, payment info).
 * - nonces: spent x402 payment nonces, with TTL, for replay protection.
 * Pay-per-request billing so there's no capacity to manage at low traffic.
 */
export class Database extends Construct {
  public readonly queriesTable: dynamodb.Table;
  public readonly noncesTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);
    const prefix = props.site.resourcePrefix;

    this.queriesTable = new dynamodb.Table(this, 'QueriesTable', {
      tableName: `${prefix}-queries`,
      partitionKey: { name: 'queryId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI: list recent fact-checks newest-first (single bucket PK + createdAt SK).
    this.queriesTable.addGlobalSecondaryIndex({
      indexName: 'recent-index',
      partitionKey: { name: 'entityType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.noncesTable = new dynamodb.Table(this, 'NoncesTable', {
      tableName: `${prefix}-nonces`,
      partitionKey: { name: 'nonce', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'expiresAt',
    });
  }
}
