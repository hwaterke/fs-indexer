import * as winston from 'winston'

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
})

export const Logger = {
  debug(message: string): void {
    logger.debug(message)
  },

  info(message: string): void {
    logger.info(message)
  },

  error(message: string): void {
    logger.error(message)
  },

  setLevel(level: 'debug' | 'info'): void {
    logger.level = level
  },

  isDebug(): boolean {
    return logger.level === 'debug'
  },
}
