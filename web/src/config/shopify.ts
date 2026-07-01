import { registerAs } from '@nestjs/config';

export default registerAs('shopify', () => ({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecret: process.env.SHOPIFY_API_SECRET,
  apiVersion: process.env.SHOPIFY_API_VERSION || '2026-04',
  scopes: (
    process.env.SHOPIFY_SCOPES ||
    'read_products,read_orders,write_orders,read_delivery_customizations,write_delivery_customizations'
  )
    .replace(/\s/g, '')
    .split(',')
    .filter(Boolean),
  authPath: '/api/auth',
  callbackPath: '/api/auth/callback',
}));
