import {PromisedDatabase} from 'promised-sqlite3';

const CreateTable = `
CREATE TABLE IF NOT EXISTS
    pepe_voting (
        message TEXT NOT NULL,
        user TEXT NOT NULL,
        weight INTEGER,
        PRIMARY KEY ( message, user )
    )
`;

const VotingTable = 'pepe_voting';
const VotingOpeningTable = 'pepe_open_votings';

const InsertVotingStart = `
INSERT INTO ${VotingOpeningTable}
VALUES (?, ?, CURRENT_TIMESTAMP)
`;

const SelectOlderThan = `
SELECT channel, message
FROM ${VotingOpeningTable}
WHERE time <= datetime('now', ?)
`;

const DeleteVotingSession = `
DELETE FROM ${VotingOpeningTable}
WHERE message = ?
`;

const GetVotingResult = `
SELECT SUM(weight) AS sum
FROM pepe_voting
WHERE message = ?
`;

export const buildVoter = async (db: PromisedDatabase) => {
  await db.createTable(
    VotingTable,
    true,
    'message TEXT NOT NULL',
    'user TEXT NOT NULL',
    'weight INTEGER',
    'PRIMARY KEY ( message, user )'
  );
  await db.createTable(
    VotingOpeningTable,
    true,
    'channel TEXT NOT NULL',
    'message TEXT NOT NULL PRIMARY KEY',
    'time TEXT NOT NULL'
  );
  return {
    submitVote: async (messageId: string, user: string, value: number) => {
      await db.replace(VotingTable, {
        message: messageId,
        user: user,
        weight: value,
      });
      return (await db.get(GetVotingResult, messageId))['sum'] as number;
    },
    getVotingResult: async (messageId: string) => {
      return (await db.get(GetVotingResult, messageId))['sum'] as number;
    },
    beginVoting: async (channelId: string, messageId: string) => {
      await db.run(InsertVotingStart, channelId, messageId);
    },
    getVotingsOlderThan: async (minutes: number) => {
      return (await db.all(SelectOlderThan, `-${minutes} minute`)) as {
        channel: string;
        message: string;
      }[];
    },
    closeVoting: async (messageId: string) => {
      await db.run(DeleteVotingSession, messageId);
    },
  };
};
