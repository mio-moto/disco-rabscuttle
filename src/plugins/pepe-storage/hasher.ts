import { hash32String } from '../utils/murmurhash3_32'
import {
  type GachaHit,
  type NormalHit,
  type NormalUrl,
  type PepePhraser,
  type PepeRandomizer,
  type PepeStorage,
  type RareHit,
  type RareUrl,
  Rarity,
  type UltraHit,
  type UltraRare,
} from './types'

import { randomInt } from 'node:crypto'

const hash = (text: string) => hash32String(text, 0xf3375_600d)

const hashEntry = <T>(pepes: T[]) => {
  return (text: string) => {
    const input = text.toLowerCase()
    const entry = hash(text.toLowerCase()) || 0
    const index = (entry || 0) % pepes.length
    return pepes[index]
  }
}

function buildHit(rarity: Rarity.ultra, pepe: UltraRare): UltraHit
function buildHit(rarity: Rarity.rare, pepe: RareUrl): RareHit
function buildHit(rarity: Rarity.normal, pepe: NormalUrl): NormalHit
function buildHit(rarity: Rarity, pepe: RareUrl | NormalUrl | UltraRare) {
  return {
    rarity: rarity,
    value: pepe,
  }
}

const probabilityHit = (value: number, nth: number) => value < 1 / nth

const todayAsText = (): [Date, string] => {
  // get the beginning of the current utc day
  const day = new Date()
  day.setUTCHours(0, 0, 0, 0)
  const isoString = day.toISOString()
  const dateString = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(day)

  return [day, dateString.toLowerCase().trim()]
}

export const buildHasher = (
  storage: PepeStorage,
  randomizer: PepeRandomizer,
  phraser: PepePhraser,
  options?: { ultraChance?: number; rareChance?: number },
) => {
  const ultraChance = options?.ultraChance ?? 75
  const rareChance = options?.rareChance ?? 32.5

  const ultraHasher = hashEntry(storage.ultra)
  const rareHasher = hashEntry(storage.rare)
  const normalHasher = hashEntry(storage.normal)

  return {
    // get static singular
    hashUltra: (message: string) => buildHit(Rarity.ultra, ultraHasher(message)),
    hashRare: (message: string) => buildHit(Rarity.rare, rareHasher(message)),
    hashNormal: (message: string) => buildHit(Rarity.normal, normalHasher(message)),

    // generate the same pepe based on the day
    pepeOfTheDay: (): GachaHit & { date: Date; dateText: string } => {
      const value = randomInt(0, 281474976710655)
      const [today, textToday] = todayAsText()

      if (probabilityHit(value, 31)) {
        return {
          ...buildHit(Rarity.ultra, ultraHasher(textToday)),
          date: today,
          dateText: textToday,
        }
      }

      if (probabilityHit(value, 7)) {
        return {
          ...buildHit(Rarity.rare, rareHasher(textToday)),
          date: today,
          dateText: textToday,
        }
      }

      return {
        ...buildHit(Rarity.normal, normalHasher(textToday)),
        date: today,
        dateText: textToday,
      }
    },
    // hit the lever - hashes a normal pepe unless a lucky hit triggers a higher rarity
    gachaPepe: async (text?: string | null): Promise<GachaHit> => {
      const value = randomInt(0, 281474976710655) / 281474976710655
      if (probabilityHit(value, ultraChance)) {
        return buildHit(Rarity.ultra, randomizer.randomUltra())
      }
      if (probabilityHit(value, rareChance)) {
        return buildHit(Rarity.rare, randomizer.randomRare())
      }

      if (text) {
        const phrased = await phraser.getImage(text)
        if (phrased && storage.doesExist(phrased.url)) {
          return buildHit(Rarity.normal, phrased.url as NormalUrl)
        }
        const hashed = normalHasher(text)
        await phraser.submitPhrase(text, hashed)
        return buildHit(Rarity.normal, hashed)
      }

      return buildHit(Rarity.normal, randomizer.randomNormal())
    },

    hash: hash,
  }
}
