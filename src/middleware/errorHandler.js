const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  //Resposta de erro padrão
  let error = {
    message: 'Internal Server Error',
    status: 500
  };

  // Lidar com diferentes tipos de erros
  if (err.name === 'ValidationError') {
    error.message = 'Validation Error';
    error.status = 400;
    error.details = err.details;
  } else if (err.name === 'UnauthorizedError') {
    error.message = 'Unauthorized';
    error.status = 401;
  } else if (err.name === 'CastError') {
    error.message = 'Invalid ID format';
    error.status = 400;
  } else if (err.code === 11000) {
    error.message = 'Duplicate field value';
    error.status = 400;
  }

  // Não vaze detalhes de erros na produção
  if (process.env.NODE_ENV === 'production') {
    delete error.details;
  } else {
    error.stack = err.stack;
  }

  res.status(error.status).json({
    error: error.message,
    ...(error.details && { details: error.details }),
    ...(error.stack && { stack: error.stack })
  });
};

module.exports = { errorHandler };
