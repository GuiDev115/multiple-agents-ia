const winston = require('winston');
const path = require('path');

// Aqui cria a pasta de log caso ainda não tenha sido criada
const fs = require('fs');
const logDir = process.env.LOG_DIR || './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}


const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);


const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'agent2-external-ai' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'agent2-error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'agent2-combined.log')
    }),
  ],
});


if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
