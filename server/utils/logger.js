const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

class Logger {
  constructor() {
    this.logFile = path.join(logsDir, 'app.log');
    this.errorFile = path.join(logsDir, 'error.log');
    this.securityFile = path.join(logsDir, 'security.log');
  }

  formatMessage(level, message, metadata = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      pid: process.pid
    }) + '\n';
  }

  writeToFile(filename, content) {
    fs.appendFile(filename, content, (err) => {
      if (err) {
        console.error('Failed to write to log file:', err);
      }
    });
  }

  info(message, metadata = {}) {
    const logMessage = this.formatMessage('INFO', message, metadata);
    console.log(logMessage.trim());
    this.writeToFile(this.logFile, logMessage);
  }

  warn(message, metadata = {}) {
    const logMessage = this.formatMessage('WARN', message, metadata);
    console.warn(logMessage.trim());
    this.writeToFile(this.logFile, logMessage);
  }

  error(message, metadata = {}) {
    const logMessage = this.formatMessage('ERROR', message, metadata);
    console.error(logMessage.trim());
    this.writeToFile(this.errorFile, logMessage);
  }

  security(message, metadata = {}) {
    const logMessage = this.formatMessage('SECURITY', message, metadata);
    console.warn(`🔒 SECURITY: ${logMessage.trim()}`);
    this.writeToFile(this.securityFile, logMessage);
  }

  debug(message, metadata = {}) {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = this.formatMessage('DEBUG', message, metadata);
      console.debug(logMessage.trim());
    }
  }
}

const logger = new Logger();

module.exports = logger;