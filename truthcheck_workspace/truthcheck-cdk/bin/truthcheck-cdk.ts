#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { TruthCheckStack } from '../lib/truthcheck-cdk-stack';
import { truthcheckSite } from '../lib/sites/truthcheck';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;

new TruthCheckStack(app, 'TruthCheckStack', {
  env: { account, region: truthcheckSite.region },
});
