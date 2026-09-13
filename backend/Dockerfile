# Multi-stage build for NestJS Backend
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Ensure uploads directory exists
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
