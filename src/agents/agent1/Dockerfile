FROM node:18-alpine

# Instalando depencias para buildar modulos nativos
RUN apk add --no-cache python3 make g++


WORKDIR /app


COPY package*.json ./

# Instalando dependencias necessárias
RUN npm install --only=production

# Copia o codigo fonte
COPY . .


RUN mkdir -p logs

# Deixa a porta exposta
EXPOSE 3001

# Verifica se esta tudo funcionando
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1


RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# roda a aplicação
CMD ["node", "server.js"]
