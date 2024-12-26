import { type BaseCommand, commands } from 'receiptline'
import { loggerFactory } from '../../logging'

const log = loggerFactory('printer')
const escpos = commands.escpos

const initializePrinter = '\x1B\x40'
const disableASB = '\x1D\x61\x00'
const selectStandardFont = '\x1b\x4D\x00'
const printDirection = '\x1B\x54\x00'
const defaultLineSpacing = '\x1B\x32'
const upsideDownPrint = '\x1B\x7B\x0A'

const emptyLf = escpos.lf() + escpos.text(' ', 'multilingual')

const tp100CommandInternal: BaseCommand = {
  ...escpos,
  charWidth: 12,
  // the spec says that a paper cut only works at the beginning of a line, so we feed a line
  open: () => `${initializePrinter}${disableASB}${selectStandardFont}${printDirection}${defaultLineSpacing}${upsideDownPrint}`,
  cut: () => '\x1D\x56\x01',
  close: () => `${emptyLf}${emptyLf}${emptyLf}${emptyLf}${escpos.vrlf(false)}\x1D\x56\x01`,
  image: commands.generic.image,
}

export const tp100Command = tp100CommandInternal

/*
export const tp100Command = (() => {
  const replacement = {}
  for (const [key, value] of Object.entries(tp100CommandInternal)) {
    if (typeof value === "function") {
      replacement[key] = (...args: unknown[]) => {
        const result = tp100CommandInternal[key](...args)
        
        log.info(`${key} called with [${args.map(x => JSON.stringify(x)).join(",")}]`)
        log.info(`|> result: ${typeof result === "number" ? result : Buffer.from(result).toString("hex")}`)
        return result
      }
    } else {
      replacement[key] = value
    }
  }

  return replacement as unknown as BaseCommand
})()
*/
