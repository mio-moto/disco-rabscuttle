
import murmurhash3_32_gc from '../utils/murmurhash3_32';
import { PepeStorage, PepeRandomizer, GachaHit, Rarity, UltraRare, UltraHit, RareHit, NormalHit, RareUrl, NormalUrl } from './types';

const hash = (text: string) => murmurhash3_32_gc(text, 0xF3375_600D);

const hashEntry = <T>(pepes: T[]) => {
    return (text: string) => {
        const entry = hash(text.toLowerCase());
        const index = entry % pepes.length;
        return pepes[index];
    }
}

function buildHit(rarity: Rarity.ultra, pepe: UltraRare): UltraHit;
function buildHit(rarity: Rarity.rare, pepe: RareUrl): RareHit;
function buildHit(rarity: Rarity.normal, pepe: NormalUrl): NormalHit;
function buildHit(rarity: Rarity, pepe: RareUrl | NormalUrl | UltraRare) {
    return {
        rarity: rarity,
        value: pepe
    }
}

const probabilityHit = (value: number, nth: number) => value < (1 / nth);

const todayAsText = (): [Date, string] => {
  // get the beginning of the current utc day
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  const isoString = day.toISOString();
  const dateString = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(day);

  return [day, dateString.toLowerCase().trim()];
}

export const buildHasher = (storage: PepeStorage, randomizer: PepeRandomizer, options?: { ultraChance?: number, rareChance?: number }) => {
    const ultraChance = options?.ultraChance ?? 75;
    const rareChance = options?.rareChance ?? 32.5;

    const ultraHasher = hashEntry(storage.ultra);
    const rareHasher = hashEntry(storage.rare);
    const normalHasher = hashEntry(storage.normal);

    return {
        // get static singular 
        hashUltra: (message: string) => buildHit(Rarity.ultra, ultraHasher(message)),
        hashRare: (message: string) => buildHit(Rarity.rare, rareHasher(message)),
        hashNormal: (message: string) => buildHit(Rarity.normal, normalHasher(message)),

        // generate the same pepe based on the day
        pepeOfTheDay: (): GachaHit & { date: Date, dateText: string } => {
            const value = Math.random();
            const [today, textToday] = todayAsText();

            if(probabilityHit(value, 31)) {
                return { ...buildHit(Rarity.ultra, ultraHasher(textToday)), date: today, dateText: textToday };
            }

            if(probabilityHit(value, 7)) {
                return { ...buildHit(Rarity.rare, rareHasher(textToday)), date: today, dateText: textToday };
            }

            return { ...buildHit(Rarity.normal, normalHasher(textToday)), date: today, dateText: textToday };
        },
        // hit the lever - hashes a normal pepe unless a lucky hit triggers a higher rarity
        gachaPepe: function (text?: string | null): GachaHit {
            const value = Math.random();
            if (probabilityHit(value, ultraChance)) {
                return buildHit(Rarity.ultra, randomizer.randomUltra());
            }
            if (probabilityHit(value, rareChance)) {
                return buildHit(Rarity.rare, randomizer.randomRare());
            }

            return buildHit(Rarity.normal, text ? normalHasher(text) : randomizer.randomNormal());
        },

        hash: hash
    }
}
