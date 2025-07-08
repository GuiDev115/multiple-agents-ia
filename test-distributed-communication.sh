#!/bin/bash

# Script para testar comunicação distribuída entre agentes
# Arquivo: test-distributed-communication.sh

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
API_BASE_URL="http://localhost:8080"
TIMEOUT=30
VERBOSE=false

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

# Função para fazer requisições com retry
make_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local auth_header="$4"
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if [ "$method" = "GET" ]; then
            response=$(curl -s -w "\n%{http_code}" -H "$auth_header" -H "Content-Type: application/json" \
                --connect-timeout $TIMEOUT --max-time $TIMEOUT \
                "$API_BASE_URL$endpoint" 2>/dev/null || echo -e "\n000")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" -H "$auth_header" -H "Content-Type: application/json" \
                --connect-timeout $TIMEOUT --max-time $TIMEOUT \
                -d "$data" "$API_BASE_URL$endpoint" 2>/dev/null || echo -e "\n000")
        fi
        
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')
        
        if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
            if [ "$VERBOSE" = true ]; then
                log_info "Request successful: $method $endpoint"
                echo "$body" | jq '.' 2>/dev/null || echo "$body"
            fi
            echo "$body"
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                log_warning "Request failed (HTTP $http_code), retrying... ($retry_count/$max_retries)"
                sleep 2
            else
                log_error "Request failed after $max_retries attempts: $method $endpoint (HTTP $http_code)"
                if [ "$VERBOSE" = true ]; then
                    echo "$body"
                fi
                return 1
            fi
        fi
    done
}

# Função para verificar se jq está instalado
check_jq() {
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed. Install it with:"
        echo "  Ubuntu/Debian: sudo apt-get install jq"
        echo "  CentOS/RHEL: sudo yum install jq"
        echo "  macOS: brew install jq"
        exit 1
    fi
}

# Função para verificar se os serviços estão rodando
check_services() {
    log_info "Checking if services are running..."
    
    # Verificar se a API Gateway está respondendo
    if ! curl -s --connect-timeout 5 --max-time 5 "$API_BASE_URL/health" > /dev/null 2>&1; then
        log_error "API Gateway is not responding at $API_BASE_URL"
        log_info "Please make sure the system is running with: docker-compose up -d"
        exit 1
    fi
    
    log_success "Services are running"
}

# Função para fazer login e obter token
login() {
    log_info "Logging in..."
    
    login_data='{"username": "admin", "password": "admin123"}'
    response=$(make_request "POST" "/api/auth/login" "$login_data" "")
    
    if [ $? -eq 0 ]; then
        token=$(echo "$response" | jq -r '.token' 2>/dev/null)
        if [ "$token" != "null" ] && [ -n "$token" ]; then
            log_success "Login successful"
            echo "$token"
        else
            log_error "Failed to extract token from login response"
            exit 1
        fi
    else
        log_error "Login failed"
        exit 1
    fi
}

# Função para testar status do sistema
test_system_status() {
    log_info "Testing system status..."
    
    response=$(make_request "GET" "/api/system/status" "" "Authorization: Bearer $TOKEN")
    
    if [ $? -eq 0 ]; then
        status=$(echo "$response" | jq -r '.status' 2>/dev/null)
        if [ "$status" = "healthy" ]; then
            log_success "System status: healthy"
            return 0
        else
            log_warning "System status: $status"
            return 1
        fi
    else
        log_error "Failed to get system status"
        return 1
    fi
}

# Função para testar status dos agentes
test_agent_status() {
    log_info "Testing agent status..."
    
    response=$(make_request "GET" "/api/agents/status" "" "Authorization: Bearer $TOKEN")
    
    if [ $? -eq 0 ]; then
        agent1_status=$(echo "$response" | jq -r '.agents.agent1.status' 2>/dev/null)
        agent2_status=$(echo "$response" | jq -r '.agents.agent2.status' 2>/dev/null)
        
        if [ "$agent1_status" = "online" ] && [ "$agent2_status" = "online" ]; then
            log_success "All agents are online"
            return 0
        else
            log_warning "Agent status - Agent1: $agent1_status, Agent2: $agent2_status"
            return 1
        fi
    else
        log_error "Failed to get agent status"
        return 1
    fi
}

# Função para testar comunicação com agente específico
test_agent_communication() {
    local agent_name="$1"
    local message="$2"
    
    log_info "Testing communication with $agent_name..."
    
    request_data=$(cat <<EOF
{
    "message": "$message",
    "context": {
        "test": true,
        "timeout": 15000
    }
}
EOF
)
    
    response=$(make_request "POST" "/api/agents/$agent_name/message" "$request_data" "Authorization: Bearer $TOKEN")
    
    if [ $? -eq 0 ]; then
        agent_response=$(echo "$response" | jq -r '.response' 2>/dev/null)
        if [ "$agent_response" != "null" ] && [ -n "$agent_response" ]; then
            log_success "Communication with $agent_name successful"
            if [ "$VERBOSE" = true ]; then
                echo "Response: $agent_response"
            fi
            return 0
        else
            log_error "Invalid response from $agent_name"
            return 1
        fi
    else
        log_error "Failed to communicate with $agent_name"
        return 1
    fi
}

# Função para testar estratégias do orchestrator
test_orchestrator_strategy() {
    local strategy="$1"
    local task="$2"
    
    log_info "Testing orchestrator with $strategy strategy..."
    
    request_data=$(cat <<EOF
{
    "task": "$task",
    "strategy": "$strategy",
    "context": {
        "test": true,
        "timeout": 25000
    }
}
EOF
)
    
    response=$(make_request "POST" "/api/orchestrator/process" "$request_data" "Authorization: Bearer $TOKEN")
    
    if [ $? -eq 0 ]; then
        results=$(echo "$response" | jq -r '.results' 2>/dev/null)
        strategy_used=$(echo "$response" | jq -r '.strategy' 2>/dev/null)
        
        if [ "$results" != "null" ] && [ "$strategy_used" = "$strategy" ]; then
            log_success "Orchestrator $strategy strategy test successful"
            if [ "$VERBOSE" = true ]; then
                echo "Results: $results"
            fi
            return 0
        else
            log_error "Invalid response from orchestrator with $strategy strategy"
            return 1
        fi
    else
        log_error "Failed to test orchestrator with $strategy strategy"
        return 1
    fi
}

# Função para testar colaboração entre agentes
test_agent_collaboration() {
    log_info "Testing agent collaboration..."
    
    request_data=$(cat <<EOF
{
    "problem": "What are the advantages and disadvantages of renewable energy?",
    "agents": ["agent1", "agent2"],
    "collaboration_type": "discussion",
    "context": {
        "test": true,
        "timeout": 30000
    }
}
EOF
)
    
    response=$(make_request "POST" "/api/orchestrator/collaborate" "$request_data" "Authorization: Bearer $TOKEN")
    
    if [ $? -eq 0 ]; then
        collaboration_result=$(echo "$response" | jq -r '.collaboration_result' 2>/dev/null)
        if [ "$collaboration_result" != "null" ] && [ -n "$collaboration_result" ]; then
            log_success "Agent collaboration test successful"
            if [ "$VERBOSE" = true ]; then
                echo "Collaboration result: $collaboration_result"
            fi
            return 0
        else
            log_error "Invalid collaboration response"
            return 1
        fi
    else
        log_error "Failed to test agent collaboration"
        return 1
    fi
}

# Função para testar requisições concorrentes
test_concurrent_requests() {
    log_info "Testing concurrent requests..."
    
    local pids=()
    local temp_dir=$(mktemp -d)
    local success_count=0
    local total_requests=5
    
    for i in $(seq 1 $total_requests); do
        (
            request_data=$(cat <<EOF
{
    "task": "Test concurrent request $i. Please respond with a brief acknowledgment.",
    "strategy": "load-balanced",
    "context": {
        "test": true,
        "request_id": $i,
        "timeout": 15000
    }
}
EOF
)
            
            response=$(make_request "POST" "/api/orchestrator/process" "$request_data" "Authorization: Bearer $TOKEN")
            
            if [ $? -eq 0 ]; then
                echo "success" > "$temp_dir/result_$i"
            else
                echo "failed" > "$temp_dir/result_$i"
            fi
        ) &
        pids+=($!)
    done
    
    # Aguardar todos os processos terminarem
    for pid in "${pids[@]}"; do
        wait $pid
    done
    
    # Contar sucessos
    for i in $(seq 1 $total_requests); do
        if [ -f "$temp_dir/result_$i" ] && [ "$(cat "$temp_dir/result_$i")" = "success" ]; then
            success_count=$((success_count + 1))
        fi
    done
    
    # Limpar arquivos temporários
    rm -rf "$temp_dir"
    
    if [ $success_count -eq $total_requests ]; then
        log_success "All $total_requests concurrent requests successful"
        return 0
    else
        log_warning "Only $success_count out of $total_requests concurrent requests successful"
        return 1
    fi
}

# Função principal
main() {
    echo "======================================"
    echo "Distributed Communication Test Suite"
    echo "======================================"
    echo ""
    
    # Verificar dependências
    check_jq
    
    # Verificar se os serviços estão rodando
    check_services
    
    # Fazer login
    TOKEN=$(login)
    
    # Contadores de testes
    local total_tests=0
    local passed_tests=0
    
    # Teste 1: Status do sistema
    total_tests=$((total_tests + 1))
    if test_system_status; then
        passed_tests=$((passed_tests + 1))
    fi
    echo ""
    
    # Teste 2: Status dos agentes
    total_tests=$((total_tests + 1))
    if test_agent_status; then
        passed_tests=$((passed_tests + 1))
    fi
    echo ""
    
    # Teste 3: Comunicação com Agent 1
    total_tests=$((total_tests + 1))
    if test_agent_communication "agent1" "Hello Agent 1, this is a test message. Please respond."; then
        passed_tests=$((passed_tests + 1))
    fi
    echo ""
    
    # Teste 4: Comunicação com Agent 2
    total_tests=$((total_tests + 1))
    if test_agent_communication "agent2" "Hello Agent 2, this is a test message. Please respond."; then
        passed_tests=$((passed_tests + 1))
    fi
    echo ""
    
    # Teste 5: Estratégia Paralela
    total_tests=$((total_tests + 1))
    if test_orchestrator_strategy "parallel" "Explain what is artificial intelligence in one sentence."; then
        passed_tests=$((passed_tests + 1))
    fi
    echo ""
    
    # Teste 6: Estratégia Sequencial
    total_tests=$((total_tests + 1))
    if test_orchestrator_strategy "sequential" "First define machine learning, then give a simple example."; then
        passed_tests=$((passed_tests + 1))
    fi
    echo ""
    
    # Teste 7: Estratégia de Consenso
    total_tests=$((total_tests + 1))
    if test_orchestrator_strategy "consensus" "What is the best way to learn programming?"; then
        passed_tests=$((passed_tests + 1))
    fi
    echo ""
    
    # Teste 8: Estratégia Load-Balanced
    total_tests=$((total_tests + 1))
    if test_orchestrator_strategy "load-balanced" "Explain quantum computing in simple terms."; then
        passed_tests=$((passed_tests + 1))
    fi
    echo ""
    
    # Teste 9: Colaboração entre agentes
    total_tests=$((total_tests + 1))
    if test_agent_collaboration; then
        passed_tests=$((passed_tests + 1))
    fi
    echo ""
    
    # Teste 10: Requisições concorrentes
    total_tests=$((total_tests + 1))
    if test_concurrent_requests; then
        passed_tests=$((passed_tests + 1))
    fi
    echo ""
    
    # Resultado final
    echo "======================================"
    echo "Test Results Summary"
    echo "======================================"
    echo "Total tests: $total_tests"
    echo "Passed tests: $passed_tests"
    echo "Failed tests: $((total_tests - passed_tests))"
    echo ""
    
    if [ $passed_tests -eq $total_tests ]; then
        log_success "All tests passed! The distributed communication system is working correctly."
        exit 0
    else
        log_warning "Some tests failed. Please check the system configuration."
        exit 1
    fi
}

# Parsear argumentos da linha de comando
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -u|--url)
            API_BASE_URL="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -v, --verbose          Enable verbose output"
            echo "  -u, --url URL          Set API base URL (default: http://localhost:8080)"
            echo "  -t, --timeout SECONDS  Set request timeout (default: 30)"
            echo "  -h, --help             Show this help message"
            echo ""
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Executar função principal
main
