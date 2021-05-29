import {ActivityType, ClientUser} from 'discord.js';

export type ClientStatus = {
  statusText: string;
  statusType?: ActivityType;
};

const random = (stuff: any[]) =>
  stuff[Math.floor(Math.random() * stuff.length)];

const setStatus = (
  user: ClientUser,
  statusCollection: ClientStatus[],
  usernames: string[]
) => {
  const status = random(statusCollection);
  const username = random(usernames);
  user.setActivity(status.statusText, {type: status.statusType});
  user.setUsername(username);
};

export const enableActivitySelector = async (
  user: ClientUser,
  statusCollection: ClientStatus[],
  usernames: string[],
  rotationTimeInMs = 2 * 60 * 60 * 1000
) => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  setInterval(setStatus, rotationTimeInMs, user, statusCollection, usernames);
};
