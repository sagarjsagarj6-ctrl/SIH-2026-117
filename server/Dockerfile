# Production Dockerfile for Sovereign AI Workbench Backend
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set default production environment variables
ENV NODE_ENV=production \
    PORT=5001

# Install only production dependencies first for caching efficiency
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Ensure storage directories exist with appropriate permissions for non-root user
RUN mkdir -p data/vectordb data/demo-documents data/image-models data/training data/temp \
    && chown -R node:node /app

# Run as non-privileged user for enhanced security
USER node

# Expose backend API port
EXPOSE 5001

# Health check to ensure API daemon is operational
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:5001/api/health || exit 1

# Start the Sovereign AI Express server
CMD ["node", "index.js"]
