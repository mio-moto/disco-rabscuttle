export const truncate = (value: number, width = 2, trailingZeros = false) => {
  if (typeof value !== 'number') {
    return value
  }
  if (Number.isNaN(value)) {
    return 'NaN'
  }
  return trailingZeros ? value.toFixed(width) : Number(value.toFixed(width))
}

const metricTable = ['', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']
export const decimal = (value: number, width = 2, round = false, fixed = false) => {
  if (typeof value !== 'number' || value < 1000) {
    return `${value}`
  }
  let indexer = 0
  let calcValue = value
  while (value > 1000) {
    indexer += 1
    calcValue /= 1000
  }
  const metric = metricTable[indexer]
  if (round) {
    return `~${Math.round(value)}${metric}`
  }
  if (fixed) {
    return `${value.toFixed(width)}${metric}`
  }

  return value + metric
}
