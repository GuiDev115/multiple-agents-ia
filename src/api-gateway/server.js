const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const logger = require('./utils/logger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

//Middleware de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));

// Limitação de taxa
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limitar cada IP a 100 solicitações por windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(15 * 60 * 1000 / 1000) // segundos
  },
  standardHeaders: true, // Retorna informações de limite de taxa nos cabeçalhos `RateLimit-*`
  legacyHeaders: false, // Desabilite os cabeçalhos `X-RateLimit-*`
});

app.use('/api/', limiter);

// Middleware de análise de corpo
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de registro de solicitações
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Endpoint de verificação de integridade
app.get('/health', (req, res) => {
  res.json({
    service: 'API Gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Ponto final da documentação da API
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'Multiple Agents AI - API Gateway',
    version: '1.0.0',
    description: 'API Gateway for distributed AI agents system',
    endpoints: {
      authentication: {
        'POST /api/auth/login': 'Authenticate user and get JWT token',
        'POST /api/auth/register': 'Register new user'
      },
      agents: {
        'GET /api/agents/status': 'Get status of all agents',
        'POST /api/agents/:agentId/message': 'Send message to specific agent'
      },
      orchestrator: {
        'POST /api/orchestrator/process': 'Process task with multiple agents',
        'POST /api/orchestrator/collaborate': 'Collaborate between agents',
        'GET /api/orchestrator/analytics': 'Get system analytics'
      },
      system: {
        'GET /health': 'Health check',
        'GET /api/docs': 'API documentation'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Proxy de rotas de autenticação
app.use('/api/auth', createProxy(process.env.ORCHESTRATOR_URL || 'http://localhost:3000'));

// Agentes rotas proxy
app.use('/api/agents', createProxy(process.env.ORCHESTRATOR_URL || 'http://localhost:3000'));

// Proxy de rotas do Orchestrator
app.use('/api/orchestrator', createProxy(process.env.ORCHESTRATOR_URL || 'http://localhost:3000'));

// Endpoint de status do sistema
app.get('/api/system/status', async (req, res) => {
  try {
    const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3000';
    const agent1Url = process.env.AGENT1_URL || 'http://localhost:3001';
    const agent2Url = process.env.AGENT2_URL || 'http://localhost:3002';

    const services = [
      { name: 'Orchestrator', url: orchestratorUrl },
      { name: 'Agent 1', url: agent1Url },
      { name: 'Agent 2', url: agent2Url }
    ];

    const healthChecks = await Promise.allSettled(
      services.map(async service => {
        try {
          const response = await axios.get(`${service.url}/health`, { timeout: 5000 });
          return {
            name: service.name,
            status: 'healthy',
            url: service.url,
            response: response.data,
            responseTime: response.headers['x-response-time'] || 'N/A'
          };
        } catch (error) {
          return {
            name: service.name,
            status: 'unhealthy',
            url: service.url,
            error: error.message,
            responseTime: 'N/A'
          };
        }
      })
    );

    const results = healthChecks.map(result => result.value);
    const healthyServices = results.filter(r => r.status === 'healthy').length;

    res.json({
      gateway: {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      services: results,
      summary: {
        total: services.length,
        healthy: healthyServices,
        unhealthy: services.length - healthyServices,
        overallHealth: healthyServices === services.length ? 'healthy' : 'degraded'
      }
    });

  } catch (error) {
    logger.error('Error getting system status:', error);
    res.status(500).json({
      error: 'Failed to get system status',
      timestamp: new Date().toISOString()
    });
  }
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  logger.error('Gateway error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Função auxiliar de proxy
function createProxy(targetUrl) {
  return async (req, res) => {
    try {
      const url = `${targetUrl}${req.originalUrl}`;
      const config = {
        method: req.method,
        url: url,
        headers: {
          ...req.headers,
          'X-Forwarded-For': req.ip,
          'X-Forwarded-Proto': req.protocol,
          'X-Forwarded-Host': req.get('Host')
        },
        timeout: 30000
      };

      // Adicionar corpo para solicitações POST, PUT, PATCH
      if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
        config.data = req.body;
      }

      const response = await axios(config);
      
      // Cabeçalhos de resposta de encaminhamento
      Object.keys(response.headers).forEach(key => {
        res.set(key, response.headers[key]);
      });

      res.status(response.status).json(response.data);

    } catch (error) {
      logger.error('Proxy error:', {
        error: error.message,
        url: req.originalUrl,
        method: req.method,
        target: targetUrl
      });

      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else if (error.code === 'ECONNREFUSED') {
        res.status(503).json({
          error: 'Service unavailable',
          service: targetUrl,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          error: 'Gateway error',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  };
}

//Iniciar servidor
app.listen(PORT, () => {
  logger.info(`🚪 API Gateway running on port ${PORT}`);
  logger.info(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
