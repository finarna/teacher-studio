# ============================================
# Multi-stage Dockerfile for EduJourney
# Builds frontend and backend in one container
# ============================================

# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend (Vite)
# Environment variables will be injected at build time
ARG VITE_GEMINI_API_KEY
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# ============================================
# Stage 2: Production Runtime
# ============================================
FROM node:18-alpine

# Install PM2 globally
RUN npm install -g pm2

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production --ignore-scripts

# Copy backend server
COPY server-supabase.js ./
COPY lib ./lib
COPY utils ./utils
COPY migrations ./migrations
COPY scripts ./scripts

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./dist

# Create PM2 ecosystem file
RUN echo 'module.exports = { \
  apps: [{ \
    name: "edujourney-server", \
    script: "./server-supabase.js", \
    instances: 1, \
    exec_mode: "cluster", \
    autorestart: true, \
    watch: false, \
    max_memory_restart: "500M", \
    env: { \
      NODE_ENV: "production", \
      PORT: 9001 \
    } \
  }] \
};' > ecosystem.config.js

# Expose backend port
EXPOSE 9001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
