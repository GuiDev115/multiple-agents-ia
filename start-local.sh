#!/bin/bash

# Script para iniciar o sistema localmente
# start-local.sh

echo "🚀 Iniciando sistema Multiple Agents IA..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se Docker está rodando
if ! docker info >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker não está rodando. Iniciando Docker...${NC}"
    sudo systemctl start docker
    sleep 3
fi

# Verificar se Docker Compose existe
if ! command -v docker-compose >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker Compose não encontrado. Tentando usar 'docker compose'...${NC}"
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Parar containers existentes (se houver)
echo "🔄 Parando containers existentes..."
$DOCKER_COMPOSE down >/dev/null 2>&1

# Construir e iniciar containers
echo "🏗️  Construindo e iniciando containers..."
if $DOCKER_COMPOSE up -d --build; then
    echo -e "${GREEN}✅ Sistema iniciado com sucesso!${NC}"
    echo ""
    echo "📡 Serviços disponíveis:"
    echo "  • API Gateway: http://localhost:8080"
    echo "  • Orchestrator: http://localhost:3000"
    echo "  • Agent 1: http://localhost:3001"
    echo "  • Agent 2: http://localhost:3002"
    echo "  • Ollama: http://localhost:11434"
    echo ""
    echo "🔍 Para verificar status: docker-compose ps"
    echo "📋 Para ver logs: docker-compose logs -f"
    echo "⛔ Para parar: ./stop-local.sh"
else
    echo "❌ Erro ao iniciar o sistema. Verifique os logs:"
    $DOCKER_COMPOSE logs
    exit 1
fi
