#!/bin/bash

# Inicialização do projeto Multiple Agents IA
# Script para configurar e iniciar o sistema

echo "🚀 Iniciando Multiple Agents IA System"
echo "======================================"

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado. Por favor, instale o Docker primeiro."
    exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    echo "❌ Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro."
    exit 1
fi

# Detectar se é Docker Compose v1 ou v2
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "❌ Docker Compose não foi encontrado. Verifique se está instalado."
    exit 1
fi

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo "⚠️  Arquivo .env não encontrado. Criando a partir do .env.example..."
    cp .env.example .env
    echo "✅ Arquivo .env criado. Configure as variáveis de ambiente antes de continuar."
    echo "📝 Editando .env..."
    
    # Gerar JWT secret aleatório
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s/your-super-secret-jwt-key-here/$JWT_SECRET/" .env
    
    echo "✅ JWT Secret gerado automaticamente."
    echo "⚠️  Configure sua OpenAI API Key no arquivo .env se necessário."
fi

# Criar diretório de logs se não existir
mkdir -p logs

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Construir e iniciar containers
echo "🐳 Construindo containers Docker..."
$DOCKER_COMPOSE_CMD build

echo "🚀 Iniciando serviços..."
$DOCKER_COMPOSE_CMD up -d

# Aguardar serviços iniciarem
echo "⏳ Aguardando serviços inicializarem..."
sleep 30

# Verificar status dos serviços
echo "🔍 Verificando status dos serviços..."
$DOCKER_COMPOSE_CMD ps

# Baixar modelo Ollama
echo "🤖 Configurando modelo Ollama..."
$DOCKER_COMPOSE_CMD exec -T ollama ollama pull llama2

# Teste de conectividade
echo "🔗 Testando conectividade..."

# Testar API Gateway
if curl -s http://localhost:8080/health > /dev/null; then
    echo "✅ API Gateway: OK"
else
    echo "❌ API Gateway: Falhou"
fi

# Testar Orchestrator
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Orchestrator: OK"
else
    echo "❌ Orchestrator: Falhou"
fi

# Testar Agent 1
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Agent 1: OK"
else
    echo "❌ Agent 1: Falhou"
fi

# Testar Agent 2
if curl -s http://localhost:3002/health > /dev/null; then
    echo "✅ Agent 2: OK"
else
    echo "❌ Agent 2: Falhou"
fi

echo ""
echo "🎉 Sistema inicializado com sucesso!"
echo "======================================"
echo "📖 Documentação da API: http://localhost:8080/api/docs"
echo "📊 Status do sistema: http://localhost:8080/api/system/status"
echo "🔐 Login padrão: admin/admin123"
echo ""
echo "🛠️  Comandos úteis:"
echo "   $DOCKER_COMPOSE_CMD logs -f          # Ver logs em tempo real"
echo "   $DOCKER_COMPOSE_CMD stop             # Parar serviços"
echo "   $DOCKER_COMPOSE_CMD down             # Parar e remover containers"
echo "   $DOCKER_COMPOSE_CMD restart          # Reiniciar serviços"
echo ""
echo "📋 Exemplo de uso:"
echo "   # 1. Fazer login"
echo "   curl -X POST http://localhost:8080/api/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"username\": \"admin\", \"password\": \"admin123\"}'"
echo ""
echo "   # 2. Usar o token retornado para processar tarefas"
echo "   curl -X POST http://localhost:8080/api/orchestrator/process \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"task\": \"Explain quantum computing\", \"strategy\": \"parallel\"}'"
echo ""
