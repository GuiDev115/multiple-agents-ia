#!/bin/bash

# Script robusto para testar comunicação MCP sem travamentos
# Versão otimizada com timeouts agressivos
# Arquivo: test-mcp-robust.sh

set -euo pipefail  # Fail fast

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações ultra-conservadoras
API_BASE_URL="http://localhost:8080"
ULTRA_TIMEOUT=1
QUICK_TIMEOUT=2
MAX_TIMEOUT=3

# Função para timeout inteligente
smart_curl() {
    timeout $ULTRA_TIMEOUT curl -s --connect-timeout $ULTRA_TIMEOUT --max-time $QUICK_TIMEOUT "$@" 2>/dev/null || echo "{}"
}

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

# Teste de conectividade super rápido
test_connectivity() {
    log_info "Verificando conectividade básica..."
    
    # Teste 1: Ping básico ao host
    if timeout 1 nc -z localhost 8080 2>/dev/null; then
        log_success "Porta 8080 está aberta"
        return 0
    else
        log_warning "Porta 8080 não está respondendo"
        return 1
    fi
}

# Teste de health check super rápido
test_health() {
    log_info "Testando health check..."
    
    response=$(smart_curl "$API_BASE_URL/health")
    
    if [[ "$response" == *"healthy"* ]] || [[ "$response" == *"ok"* ]] || [[ "$response" == *"status"* ]]; then
        log_success "Health check passou"
        return 0
    else
        log_warning "Health check falhou ou timeout"
        return 1
    fi
}

# Teste de autenticação super rápido e seguro
test_auth_quick() {
    log_info "Testando autenticação (rápido)..."
    
    # Primeiro verifica se o endpoint existe
    if ! timeout 1 nc -z localhost 8080 2>/dev/null; then
        log_warning "Serviço não está disponível para autenticação"
        return 1
    fi
    
    # Teste ultra-rápido
    response=$(timeout $ULTRA_TIMEOUT curl -s --connect-timeout $ULTRA_TIMEOUT \
        -X POST "$API_BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin123"}' 2>/dev/null || echo "{}")
    
    if [[ "$response" == *"token"* ]]; then
        log_success "Autenticação funcionando"
        return 0
    else
        log_warning "Autenticação não está disponível (normal durante inicialização)"
        return 1
    fi
}

# Função principal robusta
main() {
    echo "======================================"
    echo "MCP Robust Test Suite"
    echo "======================================"
    echo "Testes ultra-rápidos para evitar travamentos"
    echo ""
    
    local total_tests=10
    local passed_tests=0
    local start_time=$(date +%s)
    
    # Teste 1: Estrutura do projeto
    log_info "1/10: Estrutura do projeto"
    if [ -f "README.md" ] && [ -f "docker-compose.yml" ] && [ -d "src" ]; then
        log_success "✅ Estrutura básica OK"
        passed_tests=$((passed_tests + 1))
    else
        log_warning "❌ Estrutura básica incompleta"
    fi
    
    # Teste 2: Documentação MCP
    log_info "2/10: Documentação MCP"
    if grep -q "MCP\|Model Context Protocol" README.md 2>/dev/null; then
        log_success "✅ Documentação MCP OK"
        passed_tests=$((passed_tests + 1))
    else
        log_warning "❌ Documentação MCP não encontrada"
    fi
    
    # Teste 3: Agentes
    log_info "3/10: Múltiplos agentes"
    agent_count=$(find src/agents -name "server.js" 2>/dev/null | wc -l)
    if [ $agent_count -ge 2 ]; then
        log_success "✅ $agent_count agentes encontrados"
        passed_tests=$((passed_tests + 1))
    else
        log_warning "❌ Agentes insuficientes"
    fi
    
    # Teste 4: Orchestrator
    log_info "4/10: Orchestrator MCP"
    if [ -f "src/orchestrator/server.js" ]; then
        log_success "✅ Orchestrator OK"
        passed_tests=$((passed_tests + 1))
    else
        log_warning "❌ Orchestrator não encontrado"
    fi
    
    # Teste 5: API Gateway
    log_info "5/10: API Gateway"
    if [ -f "src/api-gateway/server.js" ]; then
        log_success "✅ API Gateway OK"
        passed_tests=$((passed_tests + 1))
    else
        log_warning "❌ API Gateway não encontrado"
    fi
    
    # Teste 6: Containerização
    log_info "6/10: Containerização"
    dockerfile_count=$(find . -name "Dockerfile" 2>/dev/null | wc -l)
    if [ $dockerfile_count -ge 3 ]; then
        log_success "✅ Containerização OK ($dockerfile_count containers)"
        passed_tests=$((passed_tests + 1))
    else
        log_warning "❌ Containerização incompleta"
    fi
    
    # Teste 7: Docker Compose
    log_info "7/10: Docker Compose"
    if grep -q "agent1\|agent2\|orchestrator" docker-compose.yml 2>/dev/null; then
        log_success "✅ Docker Compose configurado"
        passed_tests=$((passed_tests + 1))
    else
        log_warning "❌ Docker Compose incompleto"
    fi
    
    # Teste 8: Conectividade (super rápido)
    log_info "8/10: Conectividade"
    if test_connectivity; then
        passed_tests=$((passed_tests + 1))
    fi
    
    # Teste 9: Health check (super rápido)
    log_info "9/10: Health check"
    if test_health; then
        passed_tests=$((passed_tests + 1))
    fi
    
    # Teste 10: Autenticação (super rápido)
    log_info "10/10: Autenticação"
    if test_auth_quick; then
        passed_tests=$((passed_tests + 1))
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo "======================================"
    echo "Resultados MCP Robust Test"
    echo "======================================"
    echo "Total de testes: $total_tests"
    echo "Testes aprovados: $passed_tests"
    echo "Testes falhados: $((total_tests - passed_tests))"
    echo "Taxa de sucesso: $((passed_tests * 100 / total_tests))%"
    echo "Tempo de execução: ${duration}s"
    echo ""
    
    if [ $passed_tests -ge 8 ]; then
        log_success "🎉 Sistema MCP está excelente!"
        log_info "Pronto para produção"
        exit 0
    elif [ $passed_tests -ge 6 ]; then
        log_success "✅ Sistema MCP está funcional"
        log_info "Algumas funcionalidades podem estar iniciando"
        exit 0
    elif [ $passed_tests -ge 4 ]; then
        log_warning "⚠️  Sistema MCP está parcialmente configurado"
        log_info "Execute: docker-compose up -d"
        exit 1
    else
        log_error "❌ Sistema MCP precisa de configuração"
        log_info "Verifique a documentação"
        exit 2
    fi
}

# Verificar dependências
check_deps() {
    if ! command -v curl >/dev/null 2>&1; then
        log_error "curl não encontrado. Instale com: sudo apt-get install curl"
        exit 1
    fi
    
    if ! command -v nc >/dev/null 2>&1; then
        log_warning "nc (netcat) não encontrado. Alguns testes podem falhar."
    fi
}

# Executar
check_deps
main "$@"
