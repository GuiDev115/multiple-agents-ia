const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const logger = require('./utils/logger');
const { authenticateToken } = require('./middleware/auth');
// Import auth routes
const authRoutes = require('./routes/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add auth routes
app.use('/api/auth', authRoutes);

// Orchestrator metadata
const orchestratorMetadata = {
  id: 'orchestrator',
  name: 'Multi-Agent Orchestrator',
  version: '1.0.0',
  capabilities: ['agent-coordination', 'task-distribution', 'result-aggregation'],
  status: 'online'
};

// In-memory storage for demonstrations (use a database in production)
const taskHistory = [];
const agentMetrics = {
  agent1: { totalRequests: 0, successfulRequests: 0, averageResponseTime: 0 },
  agent2: { totalRequests: 0, successfulRequests: 0, averageResponseTime: 0 }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    ...orchestratorMetadata,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connectedAgents: Object.keys(agentMetrics).length,
    totalTasksProcessed: taskHistory.length
  });
});

// Get orchestrator status
app.get('/api/status', authenticateToken, (req, res) => {
  res.json({
    orchestrator: orchestratorMetadata,
    agents: agentMetrics,
    recentTasks: taskHistory.slice(-10),
    timestamp: new Date().toISOString()
  });
});

// Distribute task to multiple agents
app.post('/api/distribute', authenticateToken, async (req, res) => {
  const taskId = uuidv4();
  const startTime = Date.now();

  try {
    const { task, strategy = 'parallel', agents = ['agent1', 'agent2'], context } = req.body;

    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }

    logger.info(`Distributing task ${taskId} using strategy: ${strategy}`, { task, agents });

    const result = await distributeTask(task, strategy, agents, context, taskId);

    const processingTime = Date.now() - startTime;

    // Store task history
    taskHistory.push({
      id: taskId,
      task,
      strategy,
      agents,
      result,
      processingTime,
      timestamp: new Date().toISOString(),
      user: req.user.username
    });

    res.json({
      taskId,
      message: 'Task distributed successfully',
      strategy,
      agents,
      result,
      processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Error distributing task ${taskId}:`, error);
    res.status(500).json({
      error: 'Failed to distribute task',
      taskId,
      timestamp: new Date().toISOString()
    });
  }
});

// Get task result
app.get('/api/tasks/:taskId', authenticateToken, (req, res) => {
  const { taskId } = req.params;
  const task = taskHistory.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({
    message: 'Task found',
    task,
    timestamp: new Date().toISOString()
  });
});

// Get agent metrics
app.get('/api/metrics', authenticateToken, (req, res) => {
  const totalTasks = taskHistory.length;
  const successfulTasks = taskHistory.filter(t => t.result.success).length;
  const averageProcessingTime = totalTasks > 0 
    ? taskHistory.reduce((sum, t) => sum + t.processingTime, 0) / totalTasks 
    : 0;

  res.json({
    overview: {
      totalTasks,
      successfulTasks,
      failedTasks: totalTasks - successfulTasks,
      successRate: totalTasks > 0 ? (successfulTasks / totalTasks) * 100 : 0,
      averageProcessingTime
    },
    agents: agentMetrics,
    recentActivity: taskHistory.slice(-20),
    timestamp: new Date().toISOString()
  });
});

// WebSocket server for real-time updates
const server = app.listen(PORT, () => {
  logger.info(`🎭 Orchestrator running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  logger.info('New WebSocket connection established');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      logger.info('Received WebSocket message:', data);

      // Echo back for now (extend for real-time features)
      ws.send(JSON.stringify({
        type: 'response',
        data: 'Message received',
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      logger.error('Error processing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    logger.info('WebSocket connection closed');
  });
});

// Helper functions
async function distributeTask(task, strategy, agents, context, taskId) {
  const axios = require('axios');
  const agentUrls = {
    agent1: process.env.AGENT1_URL || 'http://localhost:3001',
    agent2: process.env.AGENT2_URL || 'http://localhost:3002'
  };

  switch (strategy) {
    case 'parallel':
      return await executeParallel(task, agents, agentUrls, context, taskId);
    case 'sequential':
      return await executeSequential(task, agents, agentUrls, context, taskId);
    case 'consensus':
      return await executeConsensus(task, agents, agentUrls, context, taskId);
    case 'load-balanced':
      return await executeLoadBalanced(task, agents, agentUrls, context, taskId);
    default:
      throw new Error('Invalid strategy');
  }
}

async function executeParallel(task, agents, agentUrls, context, taskId) {
  const axios = require('axios');
  const promises = agents.map(async (agentId) => {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${agentUrls[agentId]}/api/process`, {
        message: task,
        context: { ...context, taskId, strategy: 'parallel' },
        timestamp: new Date().toISOString()
      }, { timeout: 30000 });

      const responseTime = Date.now() - startTime;
      updateAgentMetrics(agentId, responseTime, true);

      return {
        agent: agentId,
        success: true,
        response: response.data,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      updateAgentMetrics(agentId, responseTime, false);

      logger.error(`Error with agent ${agentId}:`, error);
      return {
        agent: agentId,
        success: false,
        error: error.message,
        responseTime
      };
    }
  });

  const results = await Promise.all(promises);
  const successful = results.filter(r => r.success);

  return {
    strategy: 'parallel',
    results,
    success: successful.length > 0,
    successRate: successful.length / results.length,
    totalResponseTime: Math.max(...results.map(r => r.responseTime))
  };
}

async function executeSequential(task, agents, agentUrls, context, taskId) {
  const axios = require('axios');
  const results = [];
  let currentContext = context;

  for (const agentId of agents) {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${agentUrls[agentId]}/api/process`, {
        message: task,
        context: { ...currentContext, taskId, strategy: 'sequential' },
        timestamp: new Date().toISOString()
      }, { timeout: 30000 });

      const responseTime = Date.now() - startTime;
      updateAgentMetrics(agentId, responseTime, true);

      const result = {
        agent: agentId,
        success: true,
        response: response.data,
        responseTime
      };

      results.push(result);
      currentContext = response.data.context || currentContext;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      updateAgentMetrics(agentId, responseTime, false);

      logger.error(`Error with agent ${agentId}:`, error);
      results.push({
        agent: agentId,
        success: false,
        error: error.message,
        responseTime
      });
      break; // Stop on first error in sequential processing
    }
  }

  const successful = results.filter(r => r.success);

  return {
    strategy: 'sequential',
    results,
    success: successful.length === agents.length,
    successRate: successful.length / results.length,
    totalResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0)
  };
}

async function executeConsensus(task, agents, agentUrls, context, taskId) {
  // First execute in parallel
  const parallelResult = await executeParallel(task, agents, agentUrls, context, taskId);
  
  if (!parallelResult.success) {
    return parallelResult;
  }

  // Simple consensus: majority rules or highest confidence
  const successfulResults = parallelResult.results.filter(r => r.success);
  
  if (successfulResults.length === 0) {
    return parallelResult;
  }

  // Find result with highest confidence
  const bestResult = successfulResults.reduce((best, current) => {
    const currentConfidence = current.response?.response?.confidence || 0;
    const bestConfidence = best.response?.response?.confidence || 0;
    return currentConfidence > bestConfidence ? current : best;
  });

  return {
    strategy: 'consensus',
    results: parallelResult.results,
    consensus: bestResult,
    success: true,
    successRate: parallelResult.successRate,
    totalResponseTime: parallelResult.totalResponseTime
  };
}

async function executeLoadBalanced(task, agents, agentUrls, context, taskId) {
  // Simple load balancing: choose agent with lowest average response time
  const availableAgents = agents.filter(agentId => agentUrls[agentId]);
  
  if (availableAgents.length === 0) {
    throw new Error('No available agents');
  }

  const chosenAgent = availableAgents.reduce((best, current) => {
    const currentAvg = agentMetrics[current]?.averageResponseTime || 0;
    const bestAvg = agentMetrics[best]?.averageResponseTime || 0;
    return currentAvg < bestAvg ? current : best;
  });

  logger.info(`Load balancer chose agent: ${chosenAgent}`);

  const axios = require('axios');
  const startTime = Date.now();
  
  try {
    const response = await axios.post(`${agentUrls[chosenAgent]}/api/process`, {
      message: task,
      context: { ...context, taskId, strategy: 'load-balanced' },
      timestamp: new Date().toISOString()
    }, { timeout: 30000 });

    const responseTime = Date.now() - startTime;
    updateAgentMetrics(chosenAgent, responseTime, true);

    return {
      strategy: 'load-balanced',
      chosenAgent,
      results: [{
        agent: chosenAgent,
        success: true,
        response: response.data,
        responseTime
      }],
      success: true,
      successRate: 1.0,
      totalResponseTime: responseTime
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    updateAgentMetrics(chosenAgent, responseTime, false);

    logger.error(`Error with load-balanced agent ${chosenAgent}:`, error);
    return {
      strategy: 'load-balanced',
      chosenAgent,
      results: [{
        agent: chosenAgent,
        success: false,
        error: error.message,
        responseTime
      }],
      success: false,
      successRate: 0.0,
      totalResponseTime: responseTime
    };
  }
}

function updateAgentMetrics(agentId, responseTime, success) {
  if (!agentMetrics[agentId]) {
    agentMetrics[agentId] = { totalRequests: 0, successfulRequests: 0, averageResponseTime: 0 };
  }

  const metrics = agentMetrics[agentId];
  metrics.totalRequests++;
  
  if (success) {
    metrics.successfulRequests++;
  }

  // Update average response time
  metrics.averageResponseTime = 
    (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests;
}

module.exports = { app, server };
