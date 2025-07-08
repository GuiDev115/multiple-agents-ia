// Setup for Jest tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.LOG_LEVEL = 'error';

// Configurações específicas para testes distribuídos
process.env.API_GATEWAY_PORT = '8080';
process.env.ORCHESTRATOR_PORT = '3000';
process.env.AGENT1_PORT = '3001';
process.env.AGENT2_PORT = '3002';

// URLs de teste
process.env.API_GATEWAY_URL = 'http://localhost:8080';
process.env.ORCHESTRATOR_URL = 'http://localhost:3000';
process.env.AGENT1_URL = 'http://localhost:3001';
process.env.AGENT2_URL = 'http://localhost:3002';

// Mock console.log in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Função para aguardar com timeout
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Função para retry com exponential backoff
  retry: async (fn, maxAttempts = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        await global.testUtils.waitFor(delay * Math.pow(2, attempt - 1));
      }
    }
  },
  
  // Função para validar estrutura de resposta
  validateResponse: (response, expectedStructure) => {
    const validate = (obj, structure) => {
      for (const key in structure) {
        if (!(key in obj)) {
          throw new Error(`Missing key: ${key}`);
        }
        if (typeof structure[key] === 'object' && structure[key] !== null) {
          validate(obj[key], structure[key]);
        } else if (typeof obj[key] !== structure[key]) {
          throw new Error(`Invalid type for ${key}: expected ${structure[key]}, got ${typeof obj[key]}`);
        }
      }
    };
    
    validate(response, expectedStructure);
  }
};

// Configuração de timeouts para testes distribuídos
jest.setTimeout(60000); // 60 segundos para testes distribuídos

// Configuração de variáveis de ambiente para testes
if (!process.env.CI) {
  // Configurações apenas para desenvolvimento local
  process.env.LOCAL_TESTING = 'true';
}
