import {existsSync, promises} from 'fs';
import {NormalUrl, PepeConfig, RareUrl, Rarity, UltraRare} from '.';

export const read = async <T>(location: string): Promise<T> => {
  if (!location || location.length == 0) {
    throw new Error('Data location is empty.');
  }
  if (!existsSync(location)) {
    throw new Error(
      `File at location '${location}' does not exist or cannot be found.`
    );
  }
  const fileContent = await promises.readFile(location, 'utf-8');
  if (!fileContent) {
    throw new Error(`File at '${location}' seems not to be a json`);
  }
  const result = JSON.parse(fileContent) as T | null;
  if (!result) {
    throw new Error('JSON is empty and/or not valid');
  }

  return result;
};

interface PepeStorage {
  [Rarity.ultra]: UltraRare[];
  [Rarity.rare]: RareUrl[];
  [Rarity.normal]: NormalUrl[];
}

export const buildStorage = async (
  config: PepeConfig
): Promise<PepeStorage> => {
  return {
    [Rarity.ultra]: await read<UltraRare[]>(config.ultras),
    [Rarity.rare]: await read<RareUrl[]>(config.rares),
    // currently omitting silvers, have no good use for them
    [Rarity.normal]: [
      ...(await read<NormalUrl[]>(config.normal)),
      ...(await read<NormalUrl[]>(config.silvers)),
    ],
  };
};
