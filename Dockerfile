# Multi-stage build for NestJS application in monorepo

# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app

# Copy root package.json for workspaces
COPY package.json package-lock.json ./

# Copy package.json files from workspaces
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (production only)
# --ignore-scripts prevents running prepare script (husky) which requires dev dependencies
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Stage 2: Development (for hot-reload in development)
FROM node:20-alpine AS development
WORKDIR /app

# Copy root package.json for workspaces
COPY package.json package-lock.json ./

# Copy package.json files from workspaces
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

# Copy TypeScript configs
COPY tsconfig.base.json tsconfig.json ./
COPY packages/api/tsconfig.json ./packages/api/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/api/nest-cli.json ./packages/api/

# Install all dependencies (including dev dependencies for development)
RUN npm ci && \
    npm cache clean --force

# Don't copy source code or build - it will be mounted as volume in docker-compose
# This stage is ready for development with hot-reload

# Stage 3: Build
FROM node:20-alpine AS build
WORKDIR /app

# Copy root package.json for workspaces
COPY package.json package-lock.json ./

# Copy package.json files from workspaces
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

# Copy TypeScript configs
COPY tsconfig.base.json tsconfig.json ./
COPY packages/api/tsconfig.json ./packages/api/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/api/nest-cli.json ./packages/api/

# Install all dependencies (including dev dependencies for build)
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY packages/shared/src ./packages/shared/src
COPY packages/api/src ./packages/api/src

# Build shared package first
WORKDIR /app/packages/shared
RUN npm run build

# Build the API application
WORKDIR /app/packages/api
RUN npm run build

# Stage 4: Production
FROM node:20-alpine AS production
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=dependencies --chown=nestjs:nodejs /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=dependencies --chown=nestjs:nodejs /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy built application from build stage
COPY --from=build --chown=nestjs:nodejs /app/packages/api/dist ./packages/api/dist
COPY --from=build --chown=nestjs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=nestjs:nodejs /app/packages/api/package.json ./packages/api/
COPY --from=build --chown=nestjs:nodejs /app/packages/shared/package.json ./packages/shared/

# Switch to non-root user
USER nestjs

# Set working directory to API
WORKDIR /app/packages/api

# Expose port (default 3000, can be overridden via PORT env var)
# Note: The actual port is controlled by PORT environment variable (used by NestJS in main.ts)
EXPOSE 3000

# Health check - uses PORT or API_INTERNAL_PORT environment variable with 3000 as default
# The healthcheck runs inside the container where PORT/API_INTERNAL_PORT env vars are available at runtime
# Matches the behavior of docker-compose healthcheck overrides
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || process.env.API_INTERNAL_PORT || '3000'; require('http').get('http://localhost:' + port + '/api', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "dist/main"]
