const { createLogger, format, transports } = require('winston');
const httpContext = require('express-http-context');

const {
  timestamp, combine, splat, simple, printf,
} = format;

const winstonLogger = createLogger({
  level: (process.env.NODE_ENV === 'production') ? 'info' : 'debug',
  format: combine(
    timestamp(),
    splat(),
    simple(),
    printf(info => `${info.timestamp} - (${process.pid}) - ${info.level} - ${info.message}`),
  ),
  transports: [new transports.File({ filename: 'log/eris.log' })],
});

const formatMessage = (message) => {
  const reqId = httpContext.get('reqId');
  const newMessage = reqId ? `[${reqId}]  ${message}` : message;
  return newMessage;
};

const logger = {
  log(level, message, ...args) {
    winstonLogger.log(level, formatMessage(message), ...args);
  },
};

module.exports = logger;
