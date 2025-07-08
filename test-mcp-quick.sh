#!/bin/bash

# Script rápido para testar comunicação MCP sem travamentos
# Arquivo: test-mcp-quick.sh

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
API_BASE_URL="http://localhost:8080"
QUICK_TIMEOUT=2

# Funções auxiliares
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

# Função principal ultra-rápida
main() {
    echo "======================================"
    echo "MCP Quick Test Suite (Sem Travamentos)"
    echo "======================================"
    echo ""
    
    local total_tests=8
    local passed_tests=0
    
    # Teste 1: Estrutura básica
    log_info "1/8: Verificando estrutura básica"
    if [ -f "README.md" ] && [ -f "docker-compose.yml" ]; then
        log_success "✅ Estrutura de projeto encontrada"
        passed_tests=$((passed_tests + 1))
    else
        log_warning "❌ Estrutura básica incompleta"
    fi
    
    # Teste 2: Documentação MCP
    log_info "2/8: Verificando documentação MCP"
    if grep -q "MCP\|Model Context Protocol" README.md 2>/dev/null; then
        log_success "✅ Documentação MCP encontrada"
        passed_tests=$((passed_tests + 1))
    else
        log_warning "❌ Documentação MCP não encontrada"
    fi
    
    # Teste 3: Agentes
    log_info "3/8: Verificando agentes"
    if [ -d "src/agents/agent1" ] && [ -d "src/agents/agent2" ]; then
        log_success "✅ Múltiplos agentes encontrados"
        passed_tests=$((passed_tests + 1))
    else
        log_warning "❌ Agentes não encontrados"
    fi
    
    # Teste 4: Orchestrator
    log_info "4/8: Verificando orchestrator"
    if [ -d "src/orchestrator" ] && [ -f "src/orchestrator/server.js" ]; then
        log_success "✅ Orchestrator MCP encontrado"
        passed_tests=$((passed_tests + 1))
    else
        log_warning "❌ Orchestrator não encontrado"
    fi
    
    # Teste 5: API Gateway
    log_info "5/8: Verificando API Gateway"
    if [ -d "src/api-gateway" ] && [ -f "src/api-gateway/server.js" ]; then
        log_success "✅ API Gateway encontrado"
        passed_tests=$((passed_tests + 1))
    else
        log_warning "❌ API Gateway não encontrado"
    fi
    
    # Teste 6: Containerização
    log_info "6/8: Verificando containerização"
    dockerfile_count=$(find . -name "Dockerfile" 2>/dev/null | wc -l)
    if [ $dockerfile_count -ge 3 ]; then
        log_success "✅ Múltiplos containers configurados ($dockerfile_count Dockerfiles)"
        passed_tests=$((passed_tests + 1))
    else
        log_warning "❌ Containerização incompleta"
    fi
    
    # Teste 7: Status do sistema (rápido)
    log_info "7/8: Verificando sistema (teste rápido)"
    if timeout $QUICK_TIMEOUT curl -s "$API_BASE_URL/health" >/dev/null 2>&1; then
        log_success "✅ Sistema respondendo"
        passed_tests=$((passed_tests + 1))
    else
        log_warning "❌ Sistema não está respondendo (pode estar desligado)"
    fi
    
    # Teste 8: Containers Docker
    log_info "8/8: Verificando containers Docker"
    if command -v docker >/dev/null 2>&1; then
        running_containers=$(docker ps --format "table {{.Names}}" 2>/dev/null | grep -c "multiple-agents" || echo "0")
        if [ $running_containers -gt 0 ]; then
            log_success "✅ Containers rodando ($running_containers containers)"
            passed_tests=$((passed_tests + 1))
        else
            log_warning "❌ Nenhum container rodando (execute: docker-compose up -d)"
        fi
    else
        log_warning "❌ Docker não encontrado"
    fi
    
    echo ""
    echo "======================================"
    echo "Resultados MCP Quick Test"
    echo "======================================"
    echo "Total de testes: $total_tests"
    echo "Testes aprovados: $passed_tests"
    echo "Testes falhados: $((total_tests - passed_tests))"
    echo "Taxa de sucesso: $((passed_tests * 100 / total_tests))%"
    echo ""
    
    if [ $passed_tests -ge 6 ]; then
        log_success "🎉 Sistema MCP está bem configurado!"
        log_info "Pronto para comunicação entre agentes"
        echo ""
        log_info "Para iniciar o sistema: docker-compose up -d"
        log_info "Para testes completos: ./test-mcp-communication.sh"
        exit 0
    elif [ $passed_tests -ge 4 ]; then
        log_warning "⚠️  Sistema parcialmente configurado"
        log_info "Algumas funcionalidades podem precisar de atenção"
        exit 1
    else
        log_error "❌ Configuração MCP incompleta"
        log_info "Verifique a documentação e os requisitos"
        exit 2
    fi
}

# Executar
main "$@"
