import { defineConfig, loadEnv } from 'vite';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';

// if (
//   process.env.npm_lifecycle_event === 'build' &&
//   !process.env.CI &&
//   !process.env.SHOPIFY_API_KEY
// ) {
//   throw new Error(
//     '\n\nThe frontend build will not work without an API key. Set the SHOPIFY_API_KEY environment variable when running the build command, for example:' +
//       '\n\nSHOPIFY_API_KEY=<your-api-key> npm run build\n',
//   );
// }

const frontendRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, frontendRoot, '');
  const shopifyApiKey =
    process.env.SHOPIFY_API_KEY ||
    env.SHOPIFY_API_KEY ||
    process.env.VITE_SHOPIFY_API_KEY ||
    env.VITE_SHOPIFY_API_KEY;
  const backendPort =
    process.env.BACKEND_PORT || env.BACKEND_PORT || process.env.PORT || '8081';
  const frontendPort = Number(
    process.env.FRONTEND_PORT || env.FRONTEND_PORT || 5173,
  );

  if (shopifyApiKey) {
    process.env.VITE_SHOPIFY_API_KEY = shopifyApiKey;
  }

  const proxyOptions = {
    target: `http://127.0.0.1:${backendPort}`,
    changeOrigin: false,
    secure: true,
    ws: false,
  };

  const host = (process.env.HOST || env.HOST || 'localhost').replace(
    /https?:\/\//,
    '',
  );

  let hmrConfig;
  if (host === 'localhost') {
    hmrConfig = {
      protocol: 'ws',
      host: 'localhost',
      port: 64999,
      clientPort: 64999,
    };
  } else {
    hmrConfig = {
      protocol: 'wss',
      host: host,
      port: frontendPort,
      clientPort: 443,
    };
  }

  return {
    root: frontendRoot,
    plugins: [react()],
    resolve: {
      preserveSymlinks: true,
    },
    server: {
      host: 'localhost',
      port: frontendPort,
      hmr: hmrConfig,
      proxy: {
        '^/(\\?.*)?$': proxyOptions,
        '^/(orders|billing|settings|templates|blacklist|analytics|exit-iframe)(/)?(\\?.*)?$':
          proxyOptions,
        '^/api(/|(\\?.*)?$)': proxyOptions,
        '^/(privacy|privacy-policy|terms|terms-of-service|data-retention)(/|(\\?.*)?$)':
          proxyOptions,
      },
    },
  };
});
