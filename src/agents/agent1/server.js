const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('./utils/logger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const AGENT_ID = process.env.AGENT_ID || 'agent1';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Dados do agente
const agentMetadata = {
  id: AGENT_ID,
  name: 'Local AI Agent',
  type: 'local',
  model: 'llama2',
  capabilities: ['text-generation', 'analysis', 'reasoning'],
  status: 'online',
  version: '1.0.0'
};

// Verificação do endpoint 
app.get('/health', (req, res) => {
  res.json({
    ...agentMetadata,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    ollamaStatus: 'connected' // This would be checked in production
  });
});

// Processando a mensagem
app.post('/api/process', async (req, res) => {
  const startTime = Date.now();
  const requestId = uuidv4();

  try {
    const { message, context, requestId: clientRequestId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    logger.info(`Processing message: ${message}`, { requestId, clientRequestId });

    // Faz o processamento local com Ollama
    const aiResponse = await processWithOllama(message, context);

    const processingTime = Date.now() - startTime;

    const response = {
      requestId,
      agent: agentMetadata,
      response: aiResponse,
      processingTime,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        processedBy: AGENT_ID,
        model: 'llama2'
      }
    };

    logger.info(`Message processed successfully`, { requestId, processingTime });

    res.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error processing message:', error);

    res.status(500).json({
      error: 'Failed to process message',
      agent: agentMetadata,
      processingTime,
      timestamp: new Date().toISOString(),
      requestId
    });
  }
});


app.get('/api/capabilities', (req, res) => {
  res.json({
    agent: agentMetadata,
    capabilities: [
      {
        name: 'text-generation',
        description: 'Generate human-like text responses',
        parameters: ['prompt', 'max_tokens', 'temperature']
      },
      {
        name: 'analysis',
        description: 'Analyze and summarize text content',
        parameters: ['text', 'analysis_type']
      },
      {
        name: 'reasoning',
        description: 'Perform logical reasoning and problem solving',
        parameters: ['problem', 'reasoning_type']
      }
    ],
    timestamp: new Date().toISOString()
  });
});


async function processWithOllama(message, context = {}) {
  try {
    // Montando o prompt baseado no contexto
    let prompt = message;

    if (context.role) {
      const rolePrompts = {
        analyzer: `As an analyzer, examine the following and provide detailed analysis: ${message}`,
        reviewer: `As a reviewer, evaluate and provide feedback on: ${message}`,
        solver: `As a problem solver, provide a solution for: ${message}`,
        default: message
      };
      prompt = rolePrompts[context.role] || rolePrompts.default;
    }

    // Chamada da Ollama API
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: 'llama2',
      prompt: prompt,
      stream: false,
      options: {
        temperature: context.temperature || 0.7,
        max_tokens: context.max_tokens || 500
      }
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return {
      content: response.data.response,
      model: 'llama2',
      tokens: response.data.eval_count || 0,
      reasoning: extractReasoning(response.data.response),
      confidence: calculateConfidence(response.data.response)
    };

  } catch (error) {
    logger.error('Ollama API error:', error);


    return {
      content: `Local AI processing: ${message}. [Note: Using fallback response due to Ollama unavailability]`,
      model: 'fallback',
      tokens: 0,
      reasoning: 'Fallback processing - no advanced reasoning available',
      confidence: 0.5,
      fallback: true
    };
  }
}

// Funções auxiliares
function extractReasoning(response) {

  const reasoningMarkers = ['because', 'therefore', 'thus', 'since', 'as a result'];
  const sentences = response.split('.');

  const reasoningSentences = sentences.filter(sentence =>
    reasoningMarkers.some(marker => sentence.toLowerCase().includes(marker))
  );

  return reasoningSentences.length > 0 ? reasoningSentences.join('.') : 'No explicit reasoning found';
}

function calculateConfidence(response) {

  const length = response.length;
  const hasNumbers = /\d/.test(response);
  const hasSpecificTerms = /specifically|exactly|precisely|clearly/.test(response.toLowerCase());

  let confidence = 0.5; // Base confidence

  if (length > 100) confidence += 0.1;
  if (hasNumbers) confidence += 0.1;
  if (hasSpecificTerms) confidence += 0.2;

  return Math.min(confidence, 1.0);
}


app.listen(PORT, () => {
  logger.info(`🤖 Agent1 (Local AI) running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
