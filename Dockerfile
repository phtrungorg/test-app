# Use Node.js 18 LTS with Alpine for smaller image size
FROM node:18-alpine

# Install FFmpeg and required dependencies
RUN apk add --no-cache \
    ffmpeg \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create directory for converted videos
RUN mkdir -p /app/converted-videos

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]