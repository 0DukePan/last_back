import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format (more readable for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} ${level}: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

// Create the logger
const winstonLogger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'food-delivery-api' },
  transports: [
    // Write logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Create a stream object for Morgan (HTTP request logger)
winstonLogger.stream = {
  write: (message) => winstonLogger.info(message.trim()),
};

// Add a simple middleware function for Express
const loggerMiddleware = (req, res, next) => {
  // Log request details
  winstonLogger.debug(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  // Track response time
  const start = Date.now();
  
  // Log when response is finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    winstonLogger.debug(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

export { loggerMiddleware };
export default winstonLogger;