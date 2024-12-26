import type { buildDatabase } from './database'
import type { buildHasher } from './hasher'
import type { buildPhraser } from './phraser'
import type { buildRandomizer } from './randomizer'
import type { buildSearch } from './search'
import type { buildStorage } from './storage'
import type { buildVoter } from './voting'

export enum Rarity {
  ultra = 'ultra',
  rare = 'rare',
  normal = 'normal',
}

export enum InternalRarity {
  ultra = 'ultra',
  rare = 'rare',
  silver = 'silver',
  normal = 'normal',
}

export interface PepeIconData {
  normal: string
  rare: string
  ultra: string
}

export interface PepeConfig {
  normal: string
  rares: string
  silvers: string
  ultras: string
  database: string
  icons: PepeIconData
}

export interface OwnerInfo {
  ownerId: string
  ownerName: string
  timestamp: string
}

export interface OwnerRecord {
  ownerId: string
  timestamp: string
}

export interface UltraRare {
  vid: UltraUrl
  card: string
  name: string
  number: string
}

export type GetPepe<T> = () => T

export type PepeInterface = PepeRandomizer & PepeStorage & PepeHasher & PepeDatabase & PepeSearch & PepeVoting & PepePhraser

export type PepeHasher = ReturnType<typeof buildHasher>
export type PepeRandomizer = ReturnType<typeof buildRandomizer>
export type PepeStorage = Awaited<ReturnType<typeof buildStorage>>
export type PepeDatabase = Awaited<ReturnType<typeof buildDatabase>>
export type PepeSearch = ReturnType<typeof buildSearch>
export type PepeVoting = Awaited<ReturnType<typeof buildVoter>>
export type PepePhraser = Awaited<ReturnType<typeof buildPhraser>>

export type Hit<Uniqueness extends Rarity, Payload> = {
  rarity: Uniqueness
  value: Payload
}

export type NormalHit = Hit<Rarity.normal, NormalUrl>
export type RareHit = Hit<Rarity.rare, RareUrl>
export type UltraHit = Hit<Rarity.ultra, UltraRare>
export type GachaHit = NormalHit | RareHit | UltraHit

export type UltraId = `[${string}] ${string}`

export type NormalUrl = string & { __normalBrand: never }
export type RareUrl = string & { __rareBrand: never }
export type UltraUrl = string & { __ultraBrand: never }

// {
//     "ultraOwners": {
//         "123456": {
//             "#001 - Bingboing Pepe": "1234567",
//              ...
//         },
//         ...
//     }
// }
export interface PepeOwnershipData {
  ultraOwners: {
    [guildId: string]: {
      [ultraId: UltraId]: string
    }
  }
}
