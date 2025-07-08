FROM node:18-alpine


RUN apk add --no-cache python3 make g++


WORKDIR /app


COPY package*.json ./


RUN npm install --only=production


COPY . .


RUN mkdir -p logs


EXPOSE 3002


HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1


RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs


CMD ["node", "server.js"]
