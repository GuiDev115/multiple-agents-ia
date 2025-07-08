#!/bin/bash

# Script para parar o sistema localmente
# stop-local.sh

echo "⛔ Parando sistema Multiple Agents IA..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se Docker Compose existe
if ! command -v docker-compose >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker Compose não encontrado. Tentando usar 'docker compose'...${NC}"
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Parar e remover containers
echo "🔄 Parando containers..."
if $DOCKER_COMPOSE down; then
    echo -e "${GREEN}✅ Sistema parado com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao parar alguns containers${NC}"
    echo "Tentando forçar parada..."
    
    # Força parada de containers relacionados
    docker ps -a --filter "name=multiple-agents" -q | xargs -r docker stop
    docker ps -a --filter "name=multiple-agents" -q | xargs -r docker rm
    
    echo -e "${GREEN}✅ Força parada concluída${NC}"
fi

# Limpeza opcional
read -p "🧹 Deseja remover volumes e imagens? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Removendo volumes..."
    $DOCKER_COMPOSE down -v --remove-orphans
    
    echo "🧹 Removendo imagens não utilizadas..."
    docker image prune -f
    
    echo -e "${GREEN}✅ Limpeza concluída${NC}"
fi

echo ""
echo "💡 Para reiniciar: ./start-local.sh"
