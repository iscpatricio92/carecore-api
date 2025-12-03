# Multi-stage build for NestJS application

# Stage 1: Dependencies
FROM node:20-alpine AS dependencies
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
# --ignore-scripts prevents running prepare script (husky) which requires dev dependencies
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Stage 2: Development (for hot-reload in development)
FROM node:20-alpine AS development
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Install all dependencies (including dev dependencies for development)
RUN npm ci && \
    npm cache clean --force

# Don't copy source code or build - it will be mounted as volume in docker-compose
# This stage is ready for development with hot-reload

# Stage 3: Build
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Stage 4: Production
FROM node:20-alpine AS production
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy production dependencies from dependencies stage
COPY --from=dependencies --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application from build stage
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./

# Switch to non-root user
USER nestjs

# Expose port (default 3000, can be overridden via API_INTERNAL_PORT env var)
# Note: The actual port is controlled by API_INTERNAL_PORT environment variable
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/main"]

