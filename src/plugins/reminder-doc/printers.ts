import type { Printer } from 'receiptline'
import { tp100Command } from './tp100'

export const previewPrinter: Printer = {
  cpl: 42,
  encoding: 'multilingual',
  command: 'svg',
}

export const tp100Printer: Printer = {
  cpl: 42,
  encoding: 'multilingual',
  command: tp100Command,
}
