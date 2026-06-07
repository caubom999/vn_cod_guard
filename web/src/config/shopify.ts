import { registerAs } from '@nestjs/config';

export default registerAs('shopify', () => ({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecret: process.env.SHOPIFY_API_SECRET,
  scopes: (process.env.SHOPIFY_SCOPES || 'read_products')
    .replace(/\s/g, '')
    .split(',')
    .filter(Boolean),
  authPath: '/api/auth',
  callbackPath: '/api/auth/callback',
}));
