FROM node:18-alpine

# Instalar dependências para construir módulos nativos
RUN apk add --no-cache python3 make g++ curl

#Definir diretório de trabalho
WORKDIR /app

# Copie os arquivos do pacote
COPY package*.json ./

#Instala dependências
RUN npm install --only=production

# Copia o código fonte
COPY . .

# Criar diretório de logs
RUN mkdir -p logs

# Expor porta
EXPOSE 8080

# Verificação de saúde
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Executar como usuário não root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Inicie o aplicativo
CMD ["node", "server.js"]
