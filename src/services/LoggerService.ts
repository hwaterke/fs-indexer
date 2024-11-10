import * as winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import path from 'node:path'

class Logger {
  constructor(private logger: winston.Logger) {}

  debug(message: string): void {
    this.logger.debug(message)
  }

  info(message: string): void {
    this.logger.info(message)
  }

  error(message: string): void {
    this.logger.error(message)
  }

  isDebug(): boolean {
    return this.logger.level === 'debug'
  }
}

export class LoggerService {
  private static logger: Logger | null = null

  public static configure({
    debug,
    logFolder,
  }: {
    logFolder?: string
    debug?: boolean
  }) {
    if (this.logger === null) {
      const transportArray: winston.transport[] = []

      if (logFolder) {
        transportArray.push(
          new DailyRotateFile({
            filename: path.join(logFolder, 'indexer-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json()
            ),
          })
        )
      } else {
        transportArray.push(
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp(),
              winston.format.printf(({timestamp, level, message}) => {
                return `${timestamp} [${level}]: ${message}`
              })
            ),
          })
        )
      }

      this.logger = new Logger(
        winston.createLogger({
          level: debug ? 'debug' : 'info',
          transports: transportArray,
        })
      )
    }
  }

  public static getLogger(): Logger {
    if (!LoggerService.logger) {
      throw new Error('LoggerService is not configured.')
    }
    return LoggerService.logger
  }
}
