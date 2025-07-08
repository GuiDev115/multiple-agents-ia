const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');
const logger = require('./utils/logger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;
const AGENT_ID = process.env.AGENT_ID || 'agent2';

// Iniciando o cliente do OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


const agentMetadata = {
  id: AGENT_ID,
  name: 'External AI Agent',
  type: 'external',
  model: 'gpt-3.5-turbo',
  capabilities: ['text-generation', 'analysis', 'reasoning', 'creative-writing', 'code-generation'],
  status: 'online',
  version: '1.0.0'
};


app.get('/health', (req, res) => {
  res.json({
    ...agentMetadata,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    openaiStatus: process.env.OPENAI_API_KEY ? 'configured' : 'not-configured'
  });
});


app.post('/api/process', async (req, res) => {
  const startTime = Date.now();
  const requestId = uuidv4();

  try {
    const { message, context, requestId: clientRequestId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    logger.info(`Processing message: ${message}`, { requestId, clientRequestId });

    // Processando com a IA externa (OpenAI)
    const aiResponse = await processWithOpenAI(message, context);

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
        model: 'gpt-3.5-turbo'
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
        description: 'Generate high-quality text responses',
        parameters: ['prompt', 'max_tokens', 'temperature']
      },
      {
        name: 'analysis',
        description: 'Advanced text analysis and summarization',
        parameters: ['text', 'analysis_type']
      },
      {
        name: 'reasoning',
        description: 'Complex reasoning and problem solving',
        parameters: ['problem', 'reasoning_type']
      },
      {
        name: 'creative-writing',
        description: 'Creative content generation',
        parameters: ['genre', 'style', 'length']
      },
      {
        name: 'code-generation',
        description: 'Generate and explain code',
        parameters: ['language', 'requirements']
      }
    ],
    timestamp: new Date().toISOString()
  });
});

// Processos com OpenAI
async function processWithOpenAI(message, context = {}) {
  try {

    let systemMessage = 'You are a helpful AI assistant.';

    if (context.role) {
      const roleMessages = {
        analyzer: 'You are an expert analyzer. Provide detailed, structured analysis of the given content.',
        reviewer: 'You are a critical reviewer. Evaluate the content and provide constructive feedback.',
        solver: 'You are a problem solver. Provide practical, actionable solutions.',
        creator: 'You are a creative assistant. Generate innovative and original content.',
        coder: 'You are a programming expert. Generate clean, efficient code with explanations.'
      };
      systemMessage = roleMessages[context.role] || systemMessage;
    }


    const messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: message }
    ];


    if (context.previousAnalysis) {
      messages.splice(1, 0, {
        role: 'assistant',
        content: `Previous analysis: ${JSON.stringify(context.previousAnalysis)}`
      });
    }

    // Aqui é a chamda da API do OpenAI
    const response = await openai.chat.completions.create({
      model: context.model || 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: context.max_tokens || 500,
      temperature: context.temperature || 0.7,
      top_p: context.top_p || 1,
      frequency_penalty: context.frequency_penalty || 0,
      presence_penalty: context.presence_penalty || 0
    });

    const aiResponse = response.choices[0].message.content;

    return {
      content: aiResponse,
      model: response.model,
      tokens: response.usage.total_tokens,
      reasoning: extractReasoning(aiResponse),
      confidence: calculateConfidence(aiResponse, response.usage),
      usage: response.usage
    };

  } catch (error) {
    logger.error('OpenAI API error:', error);


    return {
      content: `External AI processing: ${message}. [Note: Using fallback response due to API unavailability]`,
      model: 'fallback',
      tokens: 0,
      reasoning: 'Fallback processing - no advanced reasoning available',
      confidence: 0.5,
      fallback: true,
      error: error.message
    };
  }
}


function extractReasoning(response) {
  // Extração de padrões da response do OpenAI
  const reasoningPatterns = [
    /because\s+([^.]+)/gi,
    /therefore\s+([^.]+)/gi,
    /thus\s+([^.]+)/gi,
    /since\s+([^.]+)/gi,
    /as a result\s+([^.]+)/gi,
    /consequently\s+([^.]+)/gi
  ];

  const reasoningSegments = [];

  reasoningPatterns.forEach(pattern => {
    const matches = response.match(pattern);
    if (matches) {
      reasoningSegments.push(...matches);
    }
  });

  return reasoningSegments.length > 0 ? reasoningSegments.join(' | ') : 'Implicit reasoning in response';
}

function calculateConfidence(response, usage) {
  // Calculo da confiança com base na qualidade da resposta e no uso do token
  const length = response.length;
  const hasSpecificTerms = /specifically|exactly|precisely|clearly|definitely/.test(response.toLowerCase());
  const hasExamples = /for example|such as|like|including/.test(response.toLowerCase());
  const hasNumbers = /\d/.test(response);

  let confidence = 0.6; // Confiança básica para responses da OpenAI

  if (length > 150) confidence += 0.1;
  if (hasSpecificTerms) confidence += 0.15;
  if (hasExamples) confidence += 0.1;
  if (hasNumbers) confidence += 0.05;

  // Ajuste com base na eficiência do uso de tokens
  if (usage && usage.total_tokens > 0) {
    const tokensPerChar = usage.total_tokens / length;
    if (tokensPerChar < 0.3) confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}


app.post('/api/advanced-process', async (req, res) => {
  const startTime = Date.now();
  const requestId = uuidv4();

  try {
    const { messages, context, model = 'gpt-3.5-turbo' } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    logger.info(`Advanced processing with ${messages.length} messages`, { requestId });

    const response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: context?.max_tokens || 1000,
      temperature: context?.temperature || 0.7,
      stream: false
    });

    const processingTime = Date.now() - startTime;

    res.json({
      requestId,
      agent: agentMetadata,
      response: {
        content: response.choices[0].message.content,
        model: response.model,
        tokens: response.usage.total_tokens,
        usage: response.usage
      },
      processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error in advanced processing:', error);

    res.status(500).json({
      error: 'Failed to process advanced request',
      agent: agentMetadata,
      processingTime,
      timestamp: new Date().toISOString(),
      requestId
    });
  }
});


app.listen(PORT, () => {
  logger.info(`🤖 Agent2 (External AI) running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
