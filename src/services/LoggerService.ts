export class LoggerService {
  debug(message: string) {
    this.log('debug', message)
  }

  info(message: string) {
    this.log('info', message)
  }

  log(level: string, message: string) {
    console.log(`${level}: ${message}`)
  }
}
