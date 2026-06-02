import * as path from 'path';

// truthcheck-backend and truthcheck-frontend live as siblings of truthcheck-cdk.
export const BACKEND_PATH = path.resolve(__dirname, '..', '..', 'truthcheck-backend');
export const FRONTEND_BUILD_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'truthcheck-frontend',
  'build'
);
