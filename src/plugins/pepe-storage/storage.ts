import { existsSync, promises } from 'node:fs'
import { type NormalUrl, type PepeConfig, type RareUrl, Rarity, type UltraRare } from '.'

export const read = async <T>(location: string): Promise<T> => {
  if (!location || location.length === 0) {
    throw new Error('Data location is empty.')
  }
  if (!existsSync(location)) {
    throw new Error(`File at location '${location}' does not exist or cannot be found.`)
  }
  const fileContent = await promises.readFile(location, 'utf-8')
  if (!fileContent) {
    throw new Error(`File at '${location}' seems not to be a json`)
  }
  const result = JSON.parse(fileContent) as T | null
  if (!result) {
    throw new Error('JSON is empty and/or not valid')
  }

  return result
}

interface PepeStorage {
  [Rarity.ultra]: UltraRare[]
  [Rarity.rare]: RareUrl[]
  [Rarity.normal]: NormalUrl[]
  doesExist: (url: string) => boolean
}

export const buildStorage = async (config: PepeConfig): Promise<PepeStorage> => {
  const ultras = await read<UltraRare[]>(config.ultras)
  const rares = await read<RareUrl[]>(config.rares)
  const normals = [...(await read<NormalUrl[]>(config.normal)), ...(await read<NormalUrl[]>(config.silvers))]

  return {
    [Rarity.ultra]: ultras,
    [Rarity.rare]: rares,
    // currently omitting silvers, have no good use for them
    [Rarity.normal]: normals,
    doesExist: (url: string) => {
      return normals.some((x) => x === url) || rares.some((x) => x === url) || ultras.some((x) => x.vid === url)
    },
  }
}
