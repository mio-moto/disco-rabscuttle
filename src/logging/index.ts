import {createLogger, format, transports} from 'winston';

export const loggerFactory = (prefix: string) =>
  createLogger({
    level: 'debug',
    format: format.combine(
      format.errors({stack: true}),
      format.splat(),
      format.json()
    ),
    defaultMeta: {service: prefix},
    transports: [
      new transports.Console({
        format: format.combine(format.colorize(), format.cli()),
      }),
    ],
  });
const logger = loggerFactory('system');
export default logger;
