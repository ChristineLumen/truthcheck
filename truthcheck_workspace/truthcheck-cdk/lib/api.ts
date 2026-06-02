import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambdaBase from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';
import { Database } from './database';
import { BACKEND_PATH } from './paths';
import { SiteConfig } from './site-config';

interface ApiProps {
  database: Database;
  site: SiteConfig;
}

/**
 * REST API (proxy) backed by a single NodejsFunction. The Lambda routes
 * requests internally (see truthcheck-backend/src/api/handler.ts). It reads
 * secrets (Tavily / Anthropic keys, x402 wallet) from SSM at runtime.
 */
export class Api extends Construct {
  public readonly url: string;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const { resourcePrefix, ssmPrefix } = props.site;
    const stack = cdk.Stack.of(this);

    const apiFn = new lambda.NodejsFunction(this, 'ApiFunction', {
      functionName: `${resourcePrefix}-api`,
      entry: path.join(BACKEND_PATH, 'src/api/handler.ts'),
      projectRoot: BACKEND_PATH,
      depsLockFilePath: path.join(BACKEND_PATH, 'package-lock.json'),
      handler: 'handler',
      runtime: lambdaBase.Runtime.NODEJS_22_X,
      // Web verification + LLM synthesis can take a while; allow headroom.
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      environment: {
        SITE_ID: props.site.id,
        SSM_PREFIX: ssmPrefix,
        QUERIES_TABLE_NAME: props.database.queriesTable.tableName,
        NONCES_TABLE_NAME: props.database.noncesTable.tableName,
        X402_NETWORK: props.site.x402Network,
        PRICE: props.site.price,
      },
    });

    props.database.queriesTable.grantReadWriteData(apiFn);
    props.database.noncesTable.grantReadWriteData(apiFn);

    // Read SecureString secrets under the site's SSM prefix (and decrypt them).
    apiFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath'],
        resources: [
          `arn:aws:ssm:${stack.region}:${stack.account}:parameter${ssmPrefix}/*`,
        ],
      })
    );
    apiFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['kms:Decrypt'],
        resources: ['*'],
        conditions: {
          StringEquals: { 'kms:ViaService': `ssm.${stack.region}.amazonaws.com` },
        },
      })
    );

    const api = new apigw.RestApi(this, 'RestApi', {
      restApiName: `${resourcePrefix}-api`,
      description: `${props.site.id} fact-check API`,
      defaultCorsPreflightOptions: {
        allowOrigins: props.site.corsOrigins,
        allowMethods: apigw.Cors.ALL_METHODS,
        // x402 uses X-PAYMENT request + X-PAYMENT-RESPONSE response headers.
        allowHeaders: ['Content-Type', 'Authorization', 'X-PAYMENT'],
      },
    });

    // Single proxy route — the Lambda routes internally.
    api.root.addProxy({
      defaultIntegration: new apigw.LambdaIntegration(apiFn),
      anyMethod: true,
    });

    this.url = api.url;

    new cdk.CfnOutput(this, 'ApiUrl', { value: this.url, description: 'Fact-check API URL' });
  }
}
