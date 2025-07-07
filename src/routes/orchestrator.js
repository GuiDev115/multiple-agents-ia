const express = require('express');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Process complex task using multiple agents
router.post('/process', authenticateToken, async (req, res) => {
  try {
    const { task, strategy = 'parallel', context } = req.body;

    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }

    logger.info(`Processing task with strategy: ${strategy}`, { task, user: req.user.username });

    const results = await processTask(task, strategy, context);

    res.json({
      message: 'Task processed successfully',
      strategy,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error processing task:', error);
    res.status(500).json({ error: 'Failed to process task' });
  }
});

// Collaborate between agents
router.post('/collaborate', authenticateToken, async (req, res) => {
  try {
    const { problem, agents = ['agent1', 'agent2'] } = req.body;

    if (!problem) {
      return res.status(400).json({ error: 'Problem is required' });
    }

    logger.info(`Starting collaboration between agents: ${agents.join(', ')}`);

    const collaboration = await collaborateAgents(problem, agents);

    res.json({
      message: 'Collaboration completed successfully',
      problem,
      agents,
      collaboration,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in collaboration:', error);
    res.status(500).json({ error: 'Failed to collaborate' });
  }
});

// Get orchestration analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    // In a real implementation, this would fetch from a database
    const analytics = {
      totalTasks: 157,
      successfulTasks: 142,
      failedTasks: 15,
      averageProcessingTime: 2.3,
      agentUtilization: {
        agent1: 0.75,
        agent2: 0.68
      },
      collaborations: 23,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };

    res.json(analytics);

  } catch (error) {
    logger.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Helper functions
async function processTask(task, strategy, context) {
  const agentUrls = {
    agent1: process.env.AGENT1_URL,
    agent2: process.env.AGENT2_URL
  };

  switch (strategy) {
    case 'parallel':
      return await processParallel(task, agentUrls, context);
    case 'sequential':
      return await processSequential(task, agentUrls, context);
    case 'consensus':
      return await processConsensus(task, agentUrls, context);
    default:
      throw new Error('Invalid strategy');
  }
}

async function processParallel(task, agentUrls, context) {
  const promises = Object.entries(agentUrls).map(async ([agentId, url]) => {
    try {
      const response = await axios.post(`${url}/api/process`, {
        message: task,
        context,
        timestamp: new Date().toISOString()
      }, { timeout: 30000 });
      
      return {
        agent: agentId,
        success: true,
        response: response.data,
        processingTime: response.data.processingTime || 0
      };
    } catch (error) {
      logger.error(`Error processing task with ${agentId}:`, error);
      return {
        agent: agentId,
        success: false,
        error: error.message,
        processingTime: 0
      };
    }
  });

  return Promise.all(promises);
}

async function processSequential(task, agentUrls, context) {
  const results = [];
  let currentContext = context;

  for (const [agentId, url] of Object.entries(agentUrls)) {
    try {
      const response = await axios.post(`${url}/api/process`, {
        message: task,
        context: currentContext,
        timestamp: new Date().toISOString()
      }, { timeout: 30000 });

      const result = {
        agent: agentId,
        success: true,
        response: response.data,
        processingTime: response.data.processingTime || 0
      };

      results.push(result);
      currentContext = response.data.context || currentContext;

    } catch (error) {
      logger.error(`Error processing task with ${agentId}:`, error);
      results.push({
        agent: agentId,
        success: false,
        error: error.message,
        processingTime: 0
      });
      break; // Stop sequential processing on error
    }
  }

  return results;
}

async function processConsensus(task, agentUrls, context) {
  const parallelResults = await processParallel(task, agentUrls, context);
  
  // Simple consensus: majority wins
  const successfulResults = parallelResults.filter(r => r.success);
  
  if (successfulResults.length === 0) {
    throw new Error('No agents could process the task');
  }

  // In a real implementation, this would use more sophisticated consensus algorithms
  const consensus = {
    results: parallelResults,
    consensus: successfulResults[0].response, // Simplified
    confidence: successfulResults.length / parallelResults.length,
    timestamp: new Date().toISOString()
  };

  return consensus;
}

async function collaborateAgents(problem, agents) {
  const steps = [];
  let currentProblem = problem;

  // Step 1: Initial analysis by first agent
  try {
    const agent1Response = await axios.post(`${process.env.AGENT1_URL}/api/process`, {
      message: `Analyze this problem: ${currentProblem}`,
      context: { role: 'analyzer' },
      timestamp: new Date().toISOString()
    }, { timeout: 30000 });

    steps.push({
      step: 1,
      agent: 'agent1',
      role: 'analyzer',
      input: currentProblem,
      output: agent1Response.data
    });

    // Step 2: Solution proposal by second agent
    const agent2Response = await axios.post(`${process.env.AGENT2_URL}/api/process`, {
      message: `Based on this analysis, propose a solution: ${JSON.stringify(agent1Response.data)}`,
      context: { role: 'solver', previousAnalysis: agent1Response.data },
      timestamp: new Date().toISOString()
    }, { timeout: 30000 });

    steps.push({
      step: 2,
      agent: 'agent2',
      role: 'solver',
      input: agent1Response.data,
      output: agent2Response.data
    });

    // Step 3: Review and refinement by first agent
    const agent1Review = await axios.post(`${process.env.AGENT1_URL}/api/process`, {
      message: `Review and refine this solution: ${JSON.stringify(agent2Response.data)}`,
      context: { role: 'reviewer', originalProblem: problem },
      timestamp: new Date().toISOString()
    }, { timeout: 30000 });

    steps.push({
      step: 3,
      agent: 'agent1',
      role: 'reviewer',
      input: agent2Response.data,
      output: agent1Review.data
    });

    return {
      steps,
      finalSolution: agent1Review.data,
      collaborationSuccess: true,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error in agent collaboration:', error);
    return {
      steps,
      error: error.message,
      collaborationSuccess: false,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = router;
