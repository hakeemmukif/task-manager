import fs from 'fs';
import path from 'path';

class Logger {
  private logFile: string;

  constructor() {
    this.logFile = path.join(process.cwd(), 'api-requests.log');
    // Ensure log file exists
    if (!fs.existsSync(this.logFile)) {
      fs.writeFileSync(this.logFile, '');
    }
  }

  private formatMessage(message: any): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${typeof message === 'object' ? JSON.stringify(message, null, 2) : message}\n`;
  }

  log(message: any) {
    const formattedMessage = this.formatMessage(message);
    fs.appendFileSync(this.logFile, formattedMessage);
    console.log(formattedMessage);
  }

  logRequest(req: Request, info: any = {}) {
    const requestInfo = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: {
        authorization: req.headers.get('authorization') ? 'Bearer [TOKEN]' : 'none',
        'content-type': req.headers.get('content-type'),
      },
      ...info
    };
    this.log(requestInfo);
  }

  logError(error: any, context: string = '') {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    };
    this.log(errorInfo);
  }
}

export const logger = new Logger(); 