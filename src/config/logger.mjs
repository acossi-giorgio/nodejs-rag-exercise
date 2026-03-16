import winston from 'winston';

const level = process.env.LOG_LEVEL || 'info';

const logger = winston.createLogger({
  level,
  levels: winston.config.npm.levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.printf(info => {
      const { timestamp, level, message, stack, ...meta } = info;
      const base = `${timestamp} [${level}] ${message}`;
      const metaKeys = Object.keys(meta);
      const metaStr = metaKeys.length ? ` ${JSON.stringify(meta)}` : '';
      return stack ? `${base}\n${stack}${metaStr}` : `${base}${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    })
  ]
});

export { logger };
