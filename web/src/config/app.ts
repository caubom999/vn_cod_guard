import { registerAs } from '@nestjs/config';

export default registerAs('app', () => {
  const host = process.env.HOST || process.env.APP_URL || '';

  return {
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 8081),
    host,
    hostName: host.replace(/^https?:\/\//, ''),
    scheme:
      process.env.APP_SCHEME || (host.startsWith('http://') ? 'http' : 'https'),
  };
});
