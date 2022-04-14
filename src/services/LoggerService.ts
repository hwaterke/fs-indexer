export class LoggerService {
  debug(message: string): void {
    this.log('debug', message)
  }

  info(message: string): void {
    this.log('info', message)
  }

  log(level: string, message: string): void {
    console.log(`${level}: ${message}`)
  }
}
