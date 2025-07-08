#!/bin/bash

# Script para validar todos os requisitos do projeto
# Arquivo: validate-requirements.sh

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Variáveis de pontuação
TOTAL_POINTS=0
MAX_POINTS=40

echo "======================================"
echo "Validação de Requisitos do Projeto"
echo "Sistema Distribuído com Múltiplos Agentes de IA"
echo "======================================"
echo ""

# 1. AGENTES DE IA - 10 pontos
echo "1. AGENTES DE IA (10 pontos)"
echo "----------------------------"

# 1.1 Mínimo de dois agentes - 3 pontos
log_info "Validando: Mínimo de dois agentes (3 pontos)"
agent1_exists=false
agent2_exists=false

if [ -d "src/agents/agent1" ] && [ -f "src/agents/agent1/server.js" ]; then
    agent1_exists=true
    log_success "✅ Agent 1 encontrado"
fi

if [ -d "src/agents/agent2" ] && [ -f "src/agents/agent2/server.js" ]; then
    agent2_exists=true
    log_success "✅ Agent 2 encontrado"
fi

if $agent1_exists && $agent2_exists; then
    log_success "✅ Requisito atendido: Mínimo de dois agentes (3/3 pontos)"
    TOTAL_POINTS=$((TOTAL_POINTS + 3))
else
    log_error "❌ Requisito não atendido: Mínimo de dois agentes (0/3 pontos)"
fi

# 1.2 Pelo menos um modelo local containerizado - 7 pontos
log_info "Validando: Pelo menos um modelo local containerizado (7 pontos)"
dockerfile_agent1=false
docker_compose_agent1=false

if [ -f "src/agents/agent1/Dockerfile" ]; then
    dockerfile_agent1=true
    log_success "✅ Dockerfile do Agent 1 encontrado"
fi

if [ -f "docker-compose.yml" ]; then
    if grep -q "agent1" docker-compose.yml; then
        docker_compose_agent1=true
        log_success "✅ Agent 1 configurado no docker-compose.yml"
    fi
fi

if $dockerfile_agent1 && $docker_compose_agent1; then
    log_success "✅ Requisito atendido: Modelo local containerizado (7/7 pontos)"
    TOTAL_POINTS=$((TOTAL_POINTS + 7))
else
    log_error "❌ Requisito não atendido: Modelo local containerizado (0/7 pontos)"
fi

echo ""

# 2. COMUNICAÇÃO - 10 pontos
echo "2. COMUNICAÇÃO (10 pontos)"
echo "-------------------------"

# 2.1 Comunicação MCP/A2A - 4 pontos
log_info "Validando: Comunicação MCP/A2A (4 pontos)"
mcp_implementation=false

if [ -f "test-mcp-communication.sh" ]; then
    mcp_implementation=true
    log_success "✅ Script de teste MCP encontrado"
fi

# Verificar se há implementação MCP no código
if grep -r "mcp" src/ >/dev/null 2>&1 || grep -r "MCP" src/ >/dev/null 2>&1; then
    log_success "✅ Implementação MCP encontrada no código"
    mcp_implementation=true
fi

if $mcp_implementation; then
    log_success "✅ Requisito atendido: Comunicação MCP/A2A (4/4 pontos)"
    TOTAL_POINTS=$((TOTAL_POINTS + 4))
else
    log_error "❌ Requisito não atendido: Comunicação MCP/A2A (0/4 pontos)"
fi

# 2.2 Microserviços - 3 pontos
log_info "Validando: Microserviços (3 pontos)"
microservices_count=0

services=("orchestrator" "agent1" "agent2" "api-gateway")
for service in "${services[@]}"; do
    if [ -f "src/$service/server.js" ] || [ -f "src/agents/$service/server.js" ]; then
        microservices_count=$((microservices_count + 1))
        log_success "✅ Microserviço $service encontrado"
    fi
done

if [ $microservices_count -ge 3 ]; then
    log_success "✅ Requisito atendido: Microserviços ($microservices_count serviços) (3/3 pontos)"
    TOTAL_POINTS=$((TOTAL_POINTS + 3))
else
    log_error "❌ Requisito não atendido: Microserviços (0/3 pontos)"
fi

# 2.3 API - 3 pontos
log_info "Validando: API (3 pontos)"
api_implementation=false

if [ -f "src/api-gateway/server.js" ]; then
    api_implementation=true
    log_success "✅ API Gateway encontrado"
fi

if [ -f "tests/api.test.js" ]; then
    log_success "✅ Testes de API encontrados"
fi

if $api_implementation; then
    log_success "✅ Requisito atendido: API (3/3 pontos)"
    TOTAL_POINTS=$((TOTAL_POINTS + 3))
else
    log_error "❌ Requisito não atendido: API (0/3 pontos)"
fi

echo ""

# 3. DOCUMENTAÇÃO ARQUITETÔNICA - 15 pontos
echo "3. DOCUMENTAÇÃO ARQUITETÔNICA (15 pontos)"
echo "----------------------------------------"

# 3.1 Visão inicial - 7 pontos
log_info "Validando: Visão inicial pré-modelagem (7 pontos)"
initial_architecture=false

if [ -f "README.md" ]; then
    if grep -q "Visão Inicial" README.md || grep -q "pré-modelagem" README.md; then
        initial_architecture=true
        log_success "✅ Visão inicial encontrada no README"
    fi
fi

if $initial_architecture; then
    log_success "✅ Requisito atendido: Visão inicial (7/7 pontos)"
    TOTAL_POINTS=$((TOTAL_POINTS + 7))
else
    log_error "❌ Requisito não atendido: Visão inicial (0/7 pontos)"
fi

# 3.2 Visão final - 8 pontos
log_info "Validando: Visão final pós-modelagem (8 pontos)"
final_architecture=false

if [ -f "README.md" ]; then
    if grep -q "Visão Final" README.md || grep -q "pós-modelagem" README.md; then
        final_architecture=true
        log_success "✅ Visão final encontrada no README"
    fi
fi

if $final_architecture; then
    log_success "✅ Requisito atendido: Visão final (8/8 pontos)"
    TOTAL_POINTS=$((TOTAL_POINTS + 8))
else
    log_error "❌ Requisito não atendido: Visão final (0/8 pontos)"
fi

echo ""

# 4. VALIDAÇÃO DO PROBLEMA - 5 pontos
echo "4. VALIDAÇÃO DO PROBLEMA (5 pontos)"
echo "----------------------------------"

# 4.1 Relevância - 2.5 pontos
log_info "Validando: Relevância do problema (2.5 pontos)"
relevance_documented=false

if [ -f "README.md" ]; then
    if grep -q "Referências" README.md && grep -q "Problema" README.md; then
        relevance_documented=true
        log_success "✅ Relevância do problema documentada"
    fi
fi

if $relevance_documented; then
    log_success "✅ Requisito atendido: Relevância (2.5/2.5 pontos)"
    TOTAL_POINTS=$((TOTAL_POINTS + 2))
else
    log_error "❌ Requisito não atendido: Relevância (0/2.5 pontos)"
fi

# 4.2 Dor documentada - 2.5 pontos
log_info "Validando: Dor documentada (2.5 pontos)"
pain_documented=false

if [ -f "README.md" ]; then
    if grep -q "Dor" README.md || grep -q "problema" README.md; then
        pain_documented=true
        log_success "✅ Dor que o projeto resolve documentada"
    fi
fi

if $pain_documented; then
    log_success "✅ Requisito atendido: Dor documentada (2.5/2.5 pontos)"
    TOTAL_POINTS=$((TOTAL_POINTS + 3))
else
    log_error "❌ Requisito não atendido: Dor documentada (0/2.5 pontos)"
fi

echo ""

# TESTES ADICIONAIS
echo "VALIDAÇÕES ADICIONAIS"
echo "--------------------"

# Verificar se os testes passam
log_info "Validando: Testes unitários"
if npm run test:unit >/dev/null 2>&1; then
    log_success "✅ Testes unitários passando"
else
    log_warning "⚠️  Alguns testes unitários falharam"
fi

# Verificar se o sistema pode ser iniciado
log_info "Validando: Docker Compose"
if [ -f "docker-compose.yml" ]; then
    log_success "✅ Docker Compose configurado"
else
    log_warning "⚠️  Docker Compose não encontrado"
fi

# Verificar licença
log_info "Validando: Licença MIT"
if [ -f "LICENSE" ]; then
    if grep -q "MIT" LICENSE; then
        log_success "✅ Licença MIT encontrada"
    else
        log_warning "⚠️  Licença encontrada mas não é MIT"
    fi
else
    log_warning "⚠️  Arquivo de licença não encontrado"
fi

echo ""

# RESULTADO FINAL
echo "======================================"
echo "RESULTADO FINAL"
echo "======================================"
echo ""
echo "Pontuação obtida: $TOTAL_POINTS / $MAX_POINTS pontos"
echo ""

if [ $TOTAL_POINTS -eq $MAX_POINTS ]; then
    log_success "🎉 PARABÉNS! Todos os requisitos foram atendidos!"
    log_success "📊 Pontuação: $TOTAL_POINTS/$MAX_POINTS (100%)"
elif [ $TOTAL_POINTS -ge 35 ]; then
    log_success "✅ Excelente! Quase todos os requisitos foram atendidos!"
    log_success "📊 Pontuação: $TOTAL_POINTS/$MAX_POINTS ($(($TOTAL_POINTS * 100 / $MAX_POINTS))%)"
elif [ $TOTAL_POINTS -ge 30 ]; then
    log_warning "⚠️  Bom trabalho! Alguns requisitos precisam ser ajustados."
    log_warning "📊 Pontuação: $TOTAL_POINTS/$MAX_POINTS ($(($TOTAL_POINTS * 100 / $MAX_POINTS))%)"
else
    log_error "❌ Vários requisitos precisam ser implementados."
    log_error "📊 Pontuação: $TOTAL_POINTS/$MAX_POINTS ($(($TOTAL_POINTS * 100 / $MAX_POINTS))%)"
fi

echo ""
echo "Detalhamento da pontuação:"
echo "- Agentes de IA: 10 pontos"
echo "- Comunicação: 10 pontos"
echo "- Documentação Arquitetônica: 15 pontos"
echo "- Validação do Problema: 5 pontos"
echo "Total: 40 pontos"
echo ""

if [ $TOTAL_POINTS -lt $MAX_POINTS ]; then
    echo "📋 Próximos passos:"
    echo "1. Revisar os requisitos não atendidos"
    echo "2. Implementar as funcionalidades faltantes"
    echo "3. Executar novamente este script para validar"
    echo "4. Testar o sistema completo"
fi

echo ""
echo "📚 Para mais informações, consulte o README.md"
echo "🧪 Para testar o sistema: npm run test:all"
echo "🐳 Para iniciar o sistema: docker-compose up -d"

# Retornar código de saída baseado na pontuação
if [ $TOTAL_POINTS -ge 35 ]; then
    exit 0
else
    exit 1
fi
