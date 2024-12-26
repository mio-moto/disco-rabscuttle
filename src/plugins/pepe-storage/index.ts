import type { Kysely } from 'kysely'
import { buildDatabase } from './database'
import { buildHasher } from './hasher'
import { buildPhraser } from './phraser'
import { buildRandomizer } from './randomizer'
import { buildSearch } from './search'
import { buildStorage } from './storage'
import type { PepeConfig, PepeInterface } from './types'
import { buildVoter } from './voting'

export * from './types'

export const initializePepeInterface = async (
  config: PepeConfig,
  db: Kysely<unknown>,
  options?: { ultraChance?: number; rareChance?: number },
): Promise<PepeInterface> => {
  const database = await buildDatabase(config)
  const storage = await buildStorage(config)
  const voter = await buildVoter(db)
  const phraser = await buildPhraser(db)
  const search = buildSearch(storage)
  const randomizer = buildRandomizer(storage)
  const hasher = buildHasher(storage, randomizer, phraser, options)
  return {
    ...database,
    ...storage,
    ...randomizer,
    ...hasher,
    ...search,
    ...voter,
    ...phraser,
  }
}
