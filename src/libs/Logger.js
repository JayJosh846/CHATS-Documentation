const path = require('path');
const winston = require('winston');

class Logger {
  constructor(_context) {
    this.context = _context;
    this._loadConfiguration();
    this.logger = winston.createLogger(this.loggerConfiguration);
  }

  setContext(contextName) {}

  log(message) {
    this.logger.log({
      // Message to be logged
      message: message,
      // Level of the message logging
      level: 'info',
    });
  }

  info(message) {
    this.logger.info(message);
  }

  warn(message) {
    this.logger.warn(message);
  }

  debug(message) {
    this.logger.debug(message);
  }

  error(message) {
    this.logger.error(message);
  }

  _loadConfiguration() {
    this.loggerConfiguration = {
      transports: [
        new winston.transports.Console({
          colorize: true,
          prettyPrint: true,
          level: 'info',
        }),
        new winston.transports.File({
          level: 'error',
          // Create the log directory if it does not exist
          filename: `${path.join(process.cwd(), 'logs', 'error.log')}`,
        }),
      ],
      format: winston.format.combine(
        winston.format.label({
          label: `${this.context}`,
        }),
        winston.format.timestamp({
          format: 'MMM-DD-YYYY HH:mm:ss',
        }),
        winston.format.printf(
          info =>
            `${info.label}:${info.level.toUpperCase()} [${[info.timestamp]}] ${
              info.message
            }`,
        ),
      ),
    };
    winston.addColors({
      error: 'red',
      warn: 'yellow',
      info: 'cyan',
      debug: 'green',
    });
  }
}

module.exports = new Logger('CHATSAPI');
