FROM node:18-alpine as frontend-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    cron \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python requirements and install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy built frontend
COPY --from=frontend-builder /app/dist ./static

# Create data directory
RUN mkdir -p /app/data

# Copy cron job
COPY docker/crontab /etc/cron.d/isewan-weather
RUN chmod 0644 /etc/cron.d/isewan-weather
RUN crontab /etc/cron.d/isewan-weather

# Create startup script
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8000

CMD ["/start.sh"]