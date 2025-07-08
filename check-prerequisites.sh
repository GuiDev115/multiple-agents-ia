#!/bin/bash
# check-prerequisites.sh - Verificar pré-requisitos para execução local

echo "🔍 Verificando pré-requisitos para execução local..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para verificar comando
check_command() {
    local command=$1
    local name=$2
    local install_info=$3
    
    echo -n "Verificando $name... "
    
    if command -v "$command" &> /dev/null; then
        version=$($command --version 2>/dev/null | head -n1)
        echo -e "${GREEN}✅ Instalado${NC} ($version)"
        return 0
    else
        echo -e "${RED}❌ Não encontrado${NC}"
        if [ -n "$install_info" ]; then
            echo -e "   ${BLUE}💡 Como instalar: $install_info${NC}"
        fi
        return 1
    fi
}

# Função para verificar versão do Node.js
check_node_version() {
    if command -v node &> /dev/null; then
        version=$(node --version | cut -d'v' -f2)
        major_version=$(echo $version | cut -d'.' -f1)
        
        if [ "$major_version" -ge 18 ]; then
            echo -e "${GREEN}✅ Node.js versão OK${NC} (v$version)"
            return 0
        else
            echo -e "${RED}❌ Node.js versão muito antiga${NC} (v$version)"
            echo -e "   ${BLUE}💡 Necessário Node.js 18+${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Node.js não encontrado${NC}"
        return 1
    fi
}

# Função para verificar porta livre
check_port() {
    local port=$1
    local service=$2
    
    echo -n "Verificando porta $port ($service)... "
    
    if ! lsof -i :$port >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Livre${NC}"
        return 0
    else
        echo -e "${RED}❌ Em uso${NC}"
        process=$(lsof -i :$port | tail -n1)
        echo -e "   ${YELLOW}⚠️  Processo: $process${NC}"
        return 1
    fi
}

# Verificar sistema operacional
echo ""
echo "🖥️  Sistema operacional: $(uname -s)"
echo "📦 Distribuição: $(lsb_release -d 2>/dev/null || echo 'Não identificada')"

# Verificar pré-requisitos principais
echo ""
echo "🔧 Verificando pré-requisitos principais..."

all_good=true

# Node.js
if ! check_node_version; then
    all_good=false
fi

# npm
if ! check_command "npm" "npm" "Instalar Node.js (npm vem junto)"; then
    all_good=false
fi

# curl
if ! check_command "curl" "curl" "sudo apt install curl"; then
    all_good=false
fi

# netstat
if ! check_command "netstat" "netstat" "sudo apt install net-tools"; then
    all_good=false
fi

# lsof
if ! check_command "lsof" "lsof" "sudo apt install lsof"; then
    all_good=false
fi

# git
if ! check_command "git" "git" "sudo apt install git"; then
    all_good=false
fi

# Verificar pré-requisitos opcionais
echo ""
echo "🔧 Verificando pré-requisitos opcionais..."

# Docker (opcional)
check_command "docker" "Docker" "Veja tutorial no README.md"

# Docker Compose (opcional)
check_command "docker-compose" "Docker Compose" "Veja tutorial no README.md"

# Ollama (opcional)
check_command "ollama" "Ollama" "curl -fsSL https://ollama.com/install.sh | sh"

# Verificar portas necessárias
echo ""
echo "🔌 Verificando portas necessárias..."

port_issues=false

if ! check_port 3000 "API Gateway"; then
    port_issues=true
fi

if ! check_port 3001 "Orchestrator"; then
    port_issues=true
fi

if ! check_port 3002 "Agent 1"; then
    port_issues=true
fi

if ! check_port 3003 "Agent 2"; then
    port_issues=true
fi

# Verificar arquivos do projeto
echo ""
echo "📁 Verificando arquivos do projeto..."

check_file() {
    local file=$1
    local description=$2
    
    echo -n "Verificando $description... "
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ Encontrado${NC}"
        return 0
    else
        echo -e "${RED}❌ Não encontrado${NC}"
        return 1
    fi
}

file_issues=false

if ! check_file "package.json" "package.json principal"; then
    file_issues=true
fi

if ! check_file ".env.example" ".env.example"; then
    file_issues=true
fi

if ! check_file "start-local.sh" "script de início"; then
    file_issues=true
fi

if ! check_file "stop-local.sh" "script de parada"; then
    file_issues=true
fi

# Verificar diretórios dos serviços
echo ""
echo "📂 Verificando estrutura dos serviços..."

check_directory() {
    local dir=$1
    local description=$2
    
    echo -n "Verificando $description... "
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ Encontrado${NC}"
        return 0
    else
        echo -e "${RED}❌ Não encontrado${NC}"
        return 1
    fi
}

if ! check_directory "src/api-gateway" "API Gateway"; then
    file_issues=true
fi

if ! check_directory "src/orchestrator" "Orchestrator"; then
    file_issues=true
fi

if ! check_directory "src/agents/agent1" "Agent 1"; then
    file_issues=true
fi

if ! check_directory "src/agents/agent2" "Agent 2"; then
    file_issues=true
fi

# Verificar conformidade com requisitos acadêmicos
echo ""
echo "🎓 Verificando conformidade com requisitos acadêmicos..."

echo -n "Verificando agentes de IA... "
if [ -d "src/agents/agent1" ] && [ -d "src/agents/agent2" ]; then
    echo -e "${GREEN}✅ 2 agentes encontrados${NC}"
else
    echo -e "${RED}❌ Agentes não encontrados${NC}"
fi

echo -n "Verificando containerização... "
if [ -f "src/agents/agent1/Dockerfile" ]; then
    echo -e "${GREEN}✅ Agent1 containerizado${NC}"
else
    echo -e "${RED}❌ Agent1 não containerizado${NC}"
fi

echo -n "Verificando comunicação MCP... "
if [ -f "test-mcp-communication.sh" ]; then
    echo -e "${GREEN}✅ Comunicação MCP implementada${NC}"
else
    echo -e "${RED}❌ Comunicação MCP não encontrada${NC}"
fi

echo -n "Verificando microserviços... "
microservice_count=0
for service in "orchestrator" "api-gateway"; do
    if [ -d "src/$service" ]; then
        microservice_count=$((microservice_count + 1))
    fi
done
for agent in "agent1" "agent2"; do
    if [ -d "src/agents/$agent" ]; then
        microservice_count=$((microservice_count + 1))
    fi
done
if [ $microservice_count -ge 4 ]; then
    echo -e "${GREEN}✅ $microservice_count microserviços encontrados${NC}"
else
    echo -e "${RED}❌ Apenas $microservice_count microserviços encontrados${NC}"
fi

echo -n "Verificando documentação arquitetônica... "
if [ -f "README.md" ]; then
    if grep -q "Visão Inicial" README.md && grep -q "Visão Final" README.md; then
        echo -e "${GREEN}✅ Visões arquitetônicas documentadas${NC}"
    else
        echo -e "${RED}❌ Visões arquitetônicas incompletas${NC}"
    fi
else
    echo -e "${RED}❌ README.md não encontrado${NC}"
fi

# Resumo final
echo ""
echo "📊 Resumo da verificação:"

if $all_good && ! $port_issues && ! $file_issues; then
    echo -e "${GREEN}✅ Todos os pré-requisitos estão OK!${NC}"
    echo -e "${GREEN}🚀 Você pode executar: ./start-local.sh${NC}"
else
    echo -e "${RED}❌ Alguns pré-requisitos precisam ser corrigidos${NC}"
    
    if ! $all_good; then
        echo -e "${YELLOW}⚠️  Instale os pré-requisitos principais listados acima${NC}"
    fi
    
    if $port_issues; then
        echo -e "${YELLOW}⚠️  Libere as portas em uso ou pare os processos${NC}"
        echo -e "   ${BLUE}💡 Use: lsof -i :PORTA para ver o processo${NC}"
        echo -e "   ${BLUE}💡 Use: kill -9 PID para matar o processo${NC}"
    fi
    
    if $file_issues; then
        echo -e "${YELLOW}⚠️  Alguns arquivos/diretórios do projeto não foram encontrados${NC}"
        echo -e "   ${BLUE}💡 Verifique se você está no diretório correto do projeto${NC}"
    fi
fi

echo ""
echo "📚 Para mais informações sobre instalação, consulte o README.md"
echo "🐳 Para usar Docker ao invés de execução local, consulte a seção Docker no README.md"
