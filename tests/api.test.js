const request = require('supertest');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('../src/middleware/errorHandler');
require('dotenv').config();

// Criar uma instância do app para testes sem iniciar o servidor
const createTestApp = () => {
  const app = express();
  
  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      service: 'API Gateway',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // Mock auth route
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin123') {
      res.json({
        token: 'mock-jwt-token-for-testing',
        user: {
          id: 1,
          username: 'admin',
          role: 'admin'
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  // Mock system status route
  app.get('/api/system/status', (req, res) => {
    res.json({
      status: 'healthy',
      services: {
        orchestrator: 'healthy',
        agents: {
          agent1: 'healthy',
          agent2: 'healthy'
        }
      }
    });
  });

  // Mock agents status route
  app.get('/api/agents/status', (req, res) => {
    res.json({
      agents: {
        agent1: {
          status: 'online',
          type: 'local',
          model: 'ollama'
        },
        agent2: {
          status: 'online',
          type: 'external',
          model: 'openai'
        }
      }
    });
  });

  // Mock orchestrator process route
  app.post('/api/orchestrator/process', (req, res) => {
    const { task, strategy } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }
    
    if (!strategy) {
      return res.status(400).json({ error: 'Strategy is required' });
    }
    
    res.json({
      results: `Mock result for task: ${task}`,
      strategy: strategy,
      timestamp: new Date().toISOString()
    });
  });

  // Error handling middleware
  app.use(errorHandler);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  return app;
};

describe('API Gateway Tests', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });

  test('Health check should return 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('healthy');
    expect(response.body.service).toBe('API Gateway');
  });

  test('Invalid route should return 404', async () => {
    const response = await request(app)
      .get('/invalid-route')
      .expect(404);
    
    expect(response.body.error).toBe('Route not found');
  });

  test('Auth route should exist and work', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      })
      .expect(200);
    
    expect(response.body.token).toBeDefined();
    expect(response.body.user).toBeDefined();
    expect(response.body.user.username).toBe('admin');
  });

  test('Auth route should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'invalid',
        password: 'invalid'
      })
      .expect(401);
    
    expect(response.body.error).toBe('Invalid credentials');
  });
});

describe('System Status Tests', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });

  test('Should get system status', async () => {
    const response = await request(app)
      .get('/api/system/status')
      .expect(200);
    
    expect(response.body.status).toBe('healthy');
    expect(response.body.services).toBeDefined();
  });

  test('Should get agent status', async () => {
    const response = await request(app)
      .get('/api/agents/status')
      .expect(200);
    
    expect(response.body.agents).toBeDefined();
    expect(response.body.agents.agent1).toBeDefined();
    expect(response.body.agents.agent2).toBeDefined();
  });
});

describe('Orchestrator Tests', () => {
  let app;
  
  beforeAll(() => {
    app = createTestApp();
  });

  test('Should process task with valid data', async () => {
    const response = await request(app)
      .post('/api/orchestrator/process')
      .send({
        task: 'Test task',
        strategy: 'parallel'
      })
      .expect(200);
    
    expect(response.body.results).toBeDefined();
    expect(response.body.strategy).toBe('parallel');
  });

  test('Should reject task without required fields', async () => {
    const response = await request(app)
      .post('/api/orchestrator/process')
      .send({
        strategy: 'parallel'
      })
      .expect(400);
    
    expect(response.body.error).toBe('Task is required');
  });
});
