import Jimp from 'jimp'

export type OHLCDataPoint = {
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export const ohlcMin = (entry: OHLCDataPoint): number => Math.min.apply(null, [entry.open, entry.high, entry.low, entry.close])

export const ohlcMax = (entry: OHLCDataPoint): number => Math.max.apply(null, [entry.open, entry.high, entry.low, entry.close])

export const rasterize = (height: number, dataset: OHLCDataPoint[]) => {
  const image = new Jimp(height, dataset.length * 3 - 1, 0x0)

  const min = Math.min.apply(
    null,
    dataset.map((x) => ohlcMin(x)),
  )
  const max = Math.max.apply(
    null,
    dataset.map((x) => ohlcMax(x)),
  )

  const normalize = (curr: number) => (curr - min) / (max - min)

  dataset.forEach((x, i) => {
    const px = i * 3

    const highPoint = normalize(x.high) * height
    const lowPoint = normalize(x.low) * height
    const higher = x.open < x.close
    const color = higher ? 0x1f8b4cff : 0xe74c3cff

    for (let i = lowPoint; i < highPoint; i++) {
      image.setPixelColor(color, px, height - i)
      image.setPixelColor(color, px + 1, height - i)
    }
  })
  return image
}
