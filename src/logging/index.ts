import {createLogger, format, transports} from 'winston';
const { printf } = format;



/*
{
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
}
*/


const levelToString = (level: string): string => {
  const lowerLevel = level.toLowerCase().trim();

  switch (lowerLevel) {
    case "error":
      return "err "
    case "warn":
      return "warn"
    case "info":
      return "info"
    case "http":
      return "http"
    case "verbose":
      return "vrbs"
    case "debug":
      return "debg"
    case "silly":
      return "sill"
    default:
      return lowerLevel.substring(0, 3);
  }
}


const messageFormat = printf(({ level, message, label }) => {
  const abbreviation = levelToString(level);
  return `[${label.padEnd(6)}:${abbreviation}] ${message}`;
});

const fileFormat = printf(({ level, message, label, timestamp}) => {
  const dateObject = new Date(timestamp);
  const time = dateObject.toTimeString().split(' ')[0];
  const date = dateObject.toJSON().slice(0,10).split('-').reverse().join('/') 
  return `${date} ${time} - ${level.toUpperCase()} - [${label}] ${message}`;
})

/**
 * 
 * @param prefix should be of length 6 or less
 * @returns 
 */
export const loggerFactory = (prefix: string) =>
  createLogger({
    level: 'info',
    format: format.combine(
      format.errors({stack: true}),
      format.splat(),
      format.json()
    ),
    defaultMeta: {service: prefix},
    transports: [
      new transports.Console({
        format: format.combine(
          format.label({ label: prefix}),
          messageFormat
        ),
      }),
      new transports.File({
        level: "silly",
        filename: "data/logs/rolling.log",
        maxsize: 1024 * 128,
        maxFiles: 100,
        tailable: true,
        format: format.combine(
          format.timestamp(),
          format.label({ label: prefix }),
          fileFormat
        )
      })
    ],
  });
const logger = loggerFactory('!Default');
export default logger;
