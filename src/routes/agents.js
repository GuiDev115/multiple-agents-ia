const express = require('express');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all agents status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const agents = [
      { id: 'agent1', name: 'Local AI Agent', url: process.env.AGENT1_URL },
      { id: 'agent2', name: 'External AI Agent', url: process.env.AGENT2_URL }
    ];

    const agentStatuses = await Promise.allSettled(
      agents.map(async (agent) => {
        try {
          const response = await axios.get(`${agent.url}/health`, { timeout: 5000 });
          return {
            ...agent,
            status: 'online',
            health: response.data,
            lastCheck: new Date().toISOString()
          };
        } catch (error) {
          return {
            ...agent,
            status: 'offline',
            error: error.message,
            lastCheck: new Date().toISOString()
          };
        }
      })
    );

    const results = agentStatuses.map(result => result.value);

    res.json({
      message: 'Agent status retrieved successfully',
      agents: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting agent status:', error);
    res.status(500).json({ error: 'Failed to get agent status' });
  }
});

// Send message to specific agent
router.post('/:agentId/message', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const agentUrls = {
      agent1: process.env.AGENT1_URL,
      agent2: process.env.AGENT2_URL
    };

    const agentUrl = agentUrls[agentId];
    if (!agentUrl) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    logger.info(`Sending message to ${agentId}: ${message}`);

    const response = await axios.post(`${agentUrl}/api/process`, {
      message,
      context,
      requestId: req.user.id,
      timestamp: new Date().toISOString()
    }, { timeout: 30000 });

    res.json({
      message: 'Message sent successfully',
      agent: agentId,
      response: response.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Error sending message to agent ${req.params.agentId}:`, error);
    
    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ error: 'Agent is unavailable' });
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({ error: 'Request timeout' });
    } else {
      res.status(500).json({ error: 'Failed to send message to agent' });
    }
  }
});

module.exports = router;
