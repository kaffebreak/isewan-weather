FROM node:18-alpine as frontend-builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM python:3.11-slim

ENV TZ=Asia/Tokyo

# Install system dependencies
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    cron \
    sqlite3 \
    curl \
    tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy Python requirements and install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy built frontend
COPY --from=frontend-builder /app/dist ./static

# Create data and logs directories with proper permissions
RUN mkdir -p /app/data /app/logs && \
    chown -R appuser:appuser /app

# Copy cron job
COPY docker/crontab /etc/cron.d/isewan-weather
RUN chmod 0644 /etc/cron.d/isewan-weather && \
    chown root:root /etc/cron.d/isewan-weather

# Copy startup script
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh && \
    chown appuser:appuser /start.sh

# Switch to non-root user
USER appuser

EXPOSE 8000

CMD ["/start.sh"]
