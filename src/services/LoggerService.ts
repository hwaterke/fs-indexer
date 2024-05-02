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

  setLevel(level: 'debug' | 'info'): void {
    logger.level = level
  },
}
