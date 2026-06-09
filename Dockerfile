# Dependencies stage for node modules
FROM node:20-slim AS deps
WORKDIR /vn-cod-guard

# Install OpenSSL dependencies
RUN apt-get update && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    apt-get clean

# Copy package files cho cả frontend và backend
COPY web/frontend/package*.json ./frontend/
COPY web/package*.json ./

RUN npm install -g npm@11.0.0

# Cài đặt dependencies với cache
RUN --mount=type=cache,target=/root/.npm \
  cd frontend && npm install && \
  cd .. && npm install

# Frontend build stage
FROM node:20-slim AS frontend-builder
ARG MODE=production
ARG SHOPIFY_API_KEY
ARG VITE_CDN_URL
ARG SHOPIFY_APP_PROXY=/apps/vt
ARG VITE_HOST
ARG VITE_EMBEDDED_ID

WORKDIR /vn-cod-guard

# Cài certs để gọi API nếu cần
RUN apt-get update && \
    apt-get install -y ca-certificates && \
    apt-get clean

# Copy deps và frontend code
COPY --from=deps /vn-cod-guard/frontend/node_modules ./frontend/node_modules
COPY web/frontend ./frontend

# Build frontend
RUN if [ -z "$SHOPIFY_API_KEY" ]; then \
  echo "Error: SHOPIFY_API_KEY is required for frontend build" && exit 1; \
  fi && \
  echo "VITE_APP_SHOPIFY_API_KEY=${SHOPIFY_API_KEY}" > frontend/.env.production && \
  echo "VITE_CDN_URL=${VITE_CDN_URL}" >> frontend/.env.production && \
  echo "VITE_SHOPIFY_APP_PROXY=${SHOPIFY_APP_PROXY}" >> frontend/.env.production && \
  echo "VITE_HOST=${VITE_HOST}" >> frontend/.env.production && \
  echo "VITE_EMBEDDED_ID=${VITE_EMBEDDED_ID}" >> frontend/.env.production && \
  cd frontend && \
  npm run build -- --base ${VITE_CDN_URL} --mode ${MODE}

# Backend build stage
FROM node:20-slim AS backend-builder
WORKDIR /vn-cod-guard

# Install OpenSSL dependencies for Prisma
RUN apt-get update && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    apt-get clean

# Copy deps và source code
COPY --from=deps /vn-cod-guard/node_modules ./node_modules
COPY --from=frontend-builder /vn-cod-guard/frontend/dist ./frontend/dist
COPY web ./

# Build backend
RUN npm install -g @nestjs/cli && \
  npx prisma generate && \
  FRONTEND_NAME=frontend npm run build

# Production stage
FROM node:20-slim AS production
WORKDIR /vn-cod-guard
EXPOSE 8080

# Install runtime tools
RUN apt-get update && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    apt-get clean && \
    npm install -g pm2 pm2-logrotate

COPY --from=backend-builder /vn-cod-guard/ ./

RUN npx prisma generate

CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"]
