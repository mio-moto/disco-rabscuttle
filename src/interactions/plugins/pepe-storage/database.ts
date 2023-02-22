import { read } from "./storage";
import { PepeConfig, UltraId, UltraRare } from "./types";
import { ultraId } from "./utils";
import { writeFile } from "fs";


// {
//     "ultraOwners": {
//         "123456": {
//             "#001 - Bingboing Pepe": "1234567",
//              ...
//         },
//         ...
//     }
// }

interface OwnerEntry {
    owner: string;
    timestamp: string;
}

export interface PepeOwnershipData {
    [guildId: string]: {
        [ultraId: UltraId]: { owner: string, timestamp: string }
    }
}

export interface PepeOfTheDayData {
    [guildId: string]: {
        [date: string]: string
    }
}

export interface PepeDatabase {
    ultraOwners: PepeOwnershipData
    pepeOfTheDay: PepeOfTheDayData
}

const buildDatabaseUpdater = (config: PepeConfig, database: PepeDatabase) => {
    let [currentlyWriting, updateProposed] = [false, false];

    const write = (database: PepeDatabase, cb: (err: NodeJS.ErrnoException | null) => void) => {
        writeFile(config.database, JSON.stringify(database, null, 2), cb)
    }

    return (updatedState: PepeDatabase) => {
        // just overwrite the scoped database
        database = { ...updatedState };
        if(currentlyWriting) {
            updateProposed = true;
            return database;
        }

        updateProposed = true;
        currentlyWriting = true;

        const writeCallback = (err: NodeJS.ErrnoException | null): void => {
            if(err) { throw err; }
            if(updateProposed) {
                updateProposed = false;
                write(database, writeCallback);
            }
            currentlyWriting = false;
        }

        write(database, writeCallback);
        return database;
    }
}

const getOrSetOwnership = (pepe: UltraRare, proposedOwner: string, guildId: string, database: PepeDatabase): [boolean, OwnerEntry] => {
    const id = ultraId(pepe)

    // this guild had no ultras prior
    if(!(guildId in database.ultraOwners)) {
        database.ultraOwners[guildId] = {}
    }

    // this ultra has not been owned so far
    if(!(id in database.ultraOwners[guildId])) {
        const entry = { owner: proposedOwner, timestamp: new Date().toISOString() };
        database.ultraOwners[guildId][id] = entry;
        return [true, entry];
    }

    return [false, database.ultraOwners[guildId][id]];
}




export const buildDatabase = async (config: PepeConfig) => {
    let database = await read<PepeDatabase>(config.database);
    const updateDatabase = buildDatabaseUpdater(config, database);
    const proposeOwnership = (pepe: UltraRare, proposedOwner: string, guildId: string) => {
        const [mutated, owner] = getOrSetOwnership(pepe, proposedOwner, guildId, database);
        if(mutated) {
            database = updateDatabase(database);
        }
        return owner;
    };

    const getPepepOfTheDay = (date: Date, guildId: string): string | undefined => {
        date.setUTCHours(0, 0, 0, 0);
        const utcString = date.toISOString();
        return database.pepeOfTheDay[guildId][utcString];
    }

    const setPepeOfTheDay = (date: Date, guildId: string, url: string) => {
        date.setUTCHours(0, 0, 0, 0);
        const utcString = date.toISOString();
        if(!(guildId in database.pepeOfTheDay)) {
            database.pepeOfTheDay[guildId] = {}
        }
        database.pepeOfTheDay[guildId][utcString] = url;
        updateDatabase(database);
    } 

    return {
        proposeOwner: proposeOwnership,
        getPepepOfTheDay: getPepepOfTheDay,
        setPepeOfTheDay: setPepeOfTheDay
    }
}