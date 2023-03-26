import { shuffle } from "./randomizer";
import { NormalHit, PepeStorage, Rarity } from "./types";

const camelize = (str: string) => str
    .replace("-", " ")
    .replace("_", " ")
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase())
    .replace(/\s+/g, '');


const pepeNameRegex = /p\/(?<id>\d+)?[-_]?(?<pepe>.*?)\.(?:\w{3})$/
function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    return value !== null && value !== undefined;
}

export const buildSearch = (store: PepeStorage) => {
    const pepes = store.normal
        .map(x => {
            const result = pepeNameRegex.exec(x);
            if (!result) {
                return null;
            }
            const id = result.groups!["id"] ?? '';
            const idText = id.length > 0 ? `[${id}] ` : '';
            const name = camelize(result.groups!["pepe"])
            const renderedText = `${idText}${name.slice(0, 100 - idText.length)}`;
            return {
                "name": renderedText,
                "value": x
            }
        })
        .filter(notEmpty)


    return {
        suggestPepeName: (query: string, maxEntries: number = 20) => {
            if (query.length <= 0) {
                return shuffle([...pepes]).slice(0, maxEntries).sort((a, b) => a.name.localeCompare(b.name));
            }
            const matches = pepes.filter(x => x.name.toLowerCase().includes(query));
            return shuffle(matches).slice(0, maxEntries);
        },

        findPepeByName: (value: string) => {
            const result = pepes.find(x => x.value == value);
            if (!result) {
                return null;
            }

            return {
                ...result,
                rarity: Rarity.normal,

            }
        }
    }
} 