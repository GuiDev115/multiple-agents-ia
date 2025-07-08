const request = require('supertest');
const app = require('../src/index');

describe('Distributed Communication Test Suite', () => {
  let authToken;
  let baseUrl;

  beforeAll(async () => {
    baseUrl = process.env.TEST_BASE_URL || 'http://localhost:8080';
    
    // Fazer login para obter token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });
    
    authToken = loginResponse.body.token;
    expect(authToken).toBeDefined();
  });

  describe('System Health and Status', () => {
    test('Should verify all services are running', async () => {
      const response = await request(app)
        .get('/api/system/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body.services).toBeDefined();
      expect(response.body.services.orchestrator).toBe('healthy');
      expect(response.body.services.agents).toBeDefined();
    });

    test('Should get detailed agent status', async () => {
      const response = await request(app)
        .get('/api/agents/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.agents).toBeDefined();
      expect(response.body.agents.agent1).toBeDefined();
      expect(response.body.agents.agent2).toBeDefined();
      expect(response.body.agents.agent1.status).toBe('online');
      expect(response.body.agents.agent2.status).toBe('online');
    });
  });

  describe('Agent Communication Tests', () => {
    test('Should communicate with Agent 1 (Local/Ollama)', async () => {
      const response = await request(app)
        .post('/api/agents/agent1/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Hello Agent 1, please respond with a simple greeting.',
          context: {
            test: true,
            timeout: 10000
          }
        })
        .timeout(15000);
      
      expect(response.status).toBe(200);
      expect(response.body.response).toBeDefined();
      expect(response.body.agent).toBe('agent1');
      expect(response.body.timestamp).toBeDefined();
    });

    test('Should communicate with Agent 2 (External/OpenAI)', async () => {
      const response = await request(app)
        .post('/api/agents/agent2/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Hello Agent 2, please respond with a simple greeting.',
          context: {
            test: true,
            timeout: 10000
          }
        })
        .timeout(15000);
      
      expect(response.status).toBe(200);
      expect(response.body.response).toBeDefined();
      expect(response.body.agent).toBe('agent2');
      expect(response.body.timestamp).toBeDefined();
    });

    test('Should handle agent timeout gracefully', async () => {
      const response = await request(app)
        .post('/api/agents/agent1/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test message',
          context: {
            test: true,
            timeout: 1 // 1ms timeout to force timeout
          }
        })
        .timeout(5000);
      
      // Should either succeed or handle timeout gracefully
      expect([200, 408, 500]).toContain(response.status);
    });
  });

  describe('Orchestrator Strategy Tests', () => {
    test('Should process task with parallel strategy', async () => {
      const response = await request(app)
        .post('/api/orchestrator/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          task: 'Analyze the benefits of renewable energy. Provide a brief summary.',
          strategy: 'parallel',
          context: {
            test: true,
            domain: 'energy',
            timeout: 30000
          }
        })
        .timeout(35000);
      
      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(response.body.strategy).toBe('parallel');
      expect(response.body.agents_used).toBeDefined();
      expect(response.body.execution_time).toBeDefined();
      
      // Verificar que múltiplos agentes foram usados
      expect(response.body.agents_used.length).toBeGreaterThan(1);
    });

    test('Should process task with sequential strategy', async () => {
      const response = await request(app)
        .post('/api/orchestrator/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          task: 'First, explain what is machine learning. Then, give an example.',
          strategy: 'sequential',
          context: {
            test: true,
            domain: 'ai',
            timeout: 30000
          }
        })
        .timeout(35000);
      
      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(response.body.strategy).toBe('sequential');
      expect(response.body.execution_order).toBeDefined();
      expect(response.body.agents_used).toBeDefined();
    });

    test('Should process task with consensus strategy', async () => {
      const response = await request(app)
        .post('/api/orchestrator/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          task: 'What is the best programming language for beginners?',
          strategy: 'consensus',
          context: {
            test: true,
            criteria: ['ease_of_use', 'learning_curve', 'community_support'],
            timeout: 30000
          }
        })
        .timeout(35000);
      
      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(response.body.strategy).toBe('consensus');
      expect(response.body.consensus_score).toBeDefined();
      expect(response.body.agents_agreement).toBeDefined();
    });

    test('Should process task with load-balanced strategy', async () => {
      const response = await request(app)
        .post('/api/orchestrator/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          task: 'Explain quantum computing in simple terms.',
          strategy: 'load-balanced',
          context: {
            test: true,
            timeout: 30000
          }
        })
        .timeout(35000);
      
      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(response.body.strategy).toBe('load-balanced');
      expect(response.body.selected_agent).toBeDefined();
      expect(response.body.load_metrics).toBeDefined();
    });
  });

  describe('Agent Collaboration Tests', () => {
    test('Should facilitate collaboration between agents', async () => {
      const response = await request(app)
        .post('/api/orchestrator/collaborate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          problem: 'How can we make cities more sustainable?',
          agents: ['agent1', 'agent2'],
          collaboration_type: 'debate',
          context: {
            test: true,
            rounds: 2,
            timeout: 45000
          }
        })
        .timeout(50000);
      
      expect(response.status).toBe(200);
      expect(response.body.collaboration_result).toBeDefined();
      expect(response.body.agents_involved).toEqual(['agent1', 'agent2']);
      expect(response.body.interaction_history).toBeDefined();
      expect(response.body.final_synthesis).toBeDefined();
    });

    test('Should handle agent collaboration with discussion type', async () => {
      const response = await request(app)
        .post('/api/orchestrator/collaborate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          problem: 'What are the pros and cons of remote work?',
          agents: ['agent1', 'agent2'],
          collaboration_type: 'discussion',
          context: {
            test: true,
            timeout: 30000
          }
        })
        .timeout(35000);
      
      expect(response.status).toBe(200);
      expect(response.body.collaboration_result).toBeDefined();
      expect(response.body.discussion_summary).toBeDefined();
    });
  });

  describe('Concurrent Request Tests', () => {
    test('Should handle multiple concurrent requests', async () => {
      const promises = [];
      const requestCount = 5;
      
      for (let i = 0; i < requestCount; i++) {
        promises.push(
          request(app)
            .post('/api/orchestrator/process')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              task: `Test concurrent request ${i + 1}. Please respond with the request number.`,
              strategy: 'load-balanced',
              context: {
                test: true,
                request_id: i + 1,
                timeout: 15000
              }
            })
            .timeout(20000)
        );
      }
      
      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.results).toBeDefined();
        expect(response.body.request_id).toBe(index + 1);
      });
    });

    test('Should handle agent failover', async () => {
      // Teste com um agente potencialmente indisponível
      const response = await request(app)
        .post('/api/orchestrator/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          task: 'Test failover scenario',
          strategy: 'failover',
          context: {
            test: true,
            primary_agent: 'agent1',
            fallback_agent: 'agent2',
            timeout: 15000
          }
        })
        .timeout(20000);
      
      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(response.body.agent_used).toBeDefined();
    });
  });

  describe('Error Handling Tests', () => {
    test('Should handle invalid strategy', async () => {
      const response = await request(app)
        .post('/api/orchestrator/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          task: 'Test task',
          strategy: 'invalid_strategy',
          context: {
            test: true
          }
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('Should handle missing task', async () => {
      const response = await request(app)
        .post('/api/orchestrator/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          strategy: 'parallel',
          context: {
            test: true
          }
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('Should handle unauthorized access', async () => {
      const response = await request(app)
        .post('/api/orchestrator/process')
        .send({
          task: 'Test task',
          strategy: 'parallel'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    test('Should complete simple task within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/orchestrator/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          task: 'Say hello',
          strategy: 'load-balanced',
          context: {
            test: true,
            timeout: 10000
          }
        })
        .timeout(15000);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('Should handle large task efficiently', async () => {
      const largeTask = 'Analyze the following scenario: ' + 'A'.repeat(1000);
      
      const response = await request(app)
        .post('/api/orchestrator/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          task: largeTask,
          strategy: 'parallel',
          context: {
            test: true,
            timeout: 30000
          }
        })
        .timeout(35000);
      
      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
    });
  });

  describe('Analytics and Metrics Tests', () => {
    test('Should get orchestrator analytics', async () => {
      const response = await request(app)
        .get('/api/orchestrator/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.metrics).toBeDefined();
      expect(response.body.agent_usage).toBeDefined();
      expect(response.body.strategy_stats).toBeDefined();
    });

    test('Should get agent statistics', async () => {
      const response = await request(app)
        .get('/api/agents/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.agent1).toBeDefined();
      expect(response.body.agent2).toBeDefined();
      expect(response.body.agent1.requests_processed).toBeDefined();
      expect(response.body.agent2.requests_processed).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    test('Should complete full workflow: login -> status -> process -> analytics', async () => {
      // 1. Login (já feito no beforeAll)
      expect(authToken).toBeDefined();
      
      // 2. Check status
      const statusResponse = await request(app)
        .get('/api/system/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(statusResponse.body.status).toBe('healthy');
      
      // 3. Process task
      const processResponse = await request(app)
        .post('/api/orchestrator/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          task: 'Integration test: What is the capital of Brazil?',
          strategy: 'parallel',
          context: {
            test: true,
            timeout: 20000
          }
        })
        .timeout(25000);
      
      expect(processResponse.status).toBe(200);
      expect(processResponse.body.results).toBeDefined();
      
      // 4. Check analytics
      const analyticsResponse = await request(app)
        .get('/api/orchestrator/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(analyticsResponse.body.metrics).toBeDefined();
    });
  });
});
