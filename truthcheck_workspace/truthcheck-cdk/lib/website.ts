import * as cdk from 'aws-cdk-lib/core';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as fs from 'fs';
import { SiteConfig } from './site-config';
import { FRONTEND_BUILD_PATH } from './paths';

interface WebsiteProps {
  site: SiteConfig;
}

/**
 * Static demo page on S3, fronted by CloudFront. Scaffold mode only (served at
 * the CloudFront default *.cloudfront.net domain). The built page is published
 * on `cdk deploy` if truthcheck-frontend/build exists (two-pass deploy).
 */
export class Website extends Construct {
  constructor(scope: Construct, id: string, props: WebsiteProps) {
    super(scope, id);

    const { resourcePrefix } = props.site;
    const stack = cdk.Stack.of(this);

    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `${resourcePrefix}-web-${stack.account}-${stack.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Append index.html to directory-style requests.
    const directoryIndex = new cloudfront.Function(this, 'DirectoryIndex', {
      code: cloudfront.FunctionCode.fromInline(
        "function handler(event){var r=event.request;var u=r.uri;if(u.endsWith('/')){r.uri=u+'index.html';}else if(!u.split('/').pop().includes('.')){r.uri=u+'/index.html';}return r;}"
      ),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `${props.site.id} demo`,
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [
          {
            function: directoryIndex,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    if (fs.existsSync(FRONTEND_BUILD_PATH)) {
      new s3deploy.BucketDeployment(this, 'DeploySite', {
        sources: [s3deploy.Source.asset(FRONTEND_BUILD_PATH)],
        destinationBucket: siteBucket,
        distribution,
        distributionPaths: ['/*'],
      });
    }

    new cdk.CfnOutput(this, 'SiteUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Demo page URL',
    });
    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: distribution.distributionDomainName,
    });
  }
}
