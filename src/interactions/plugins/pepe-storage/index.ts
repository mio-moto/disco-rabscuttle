
import { buildDatabase } from './database';
import { buildHasher } from './hasher';
import { buildRandomizer } from './randomizer';
import { buildSearch } from './search';
import { buildStorage } from './storage';
import { PepeConfig, PepeInterface } from './types';

export * from "./types";


export const initializePepeInterface = async (config: PepeConfig, options?: { ultraChance?: number, rareChance?: number }): Promise<PepeInterface> => {
    const database = await buildDatabase(config);
    const storage = await buildStorage(config);
    const search = buildSearch(storage);
    const randomizer = buildRandomizer(storage);
    const hasher = buildHasher(storage, randomizer, options);
    
    
    return {
        ...database,
        ...storage,
        ...randomizer,
        ...hasher,
        ...search
    }
}
