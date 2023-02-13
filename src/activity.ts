import {ActivityType, ClientUser} from 'discord.js';
import { tryInvoke } from './utils';

export type ClientStatus = {
  statusText: string;
  statusType?: ActivityType;
};

const random = (stuff: any[]) =>
  stuff[Math.floor(Math.random() * stuff.length)];

const setUsername = (user: ClientUser, usernames: string[]) => tryInvoke(() => user.setUsername(random(usernames)));

const setStatus = (user: ClientUser,statusCollection: ClientStatus[]) => {
  const status = random(statusCollection);
  tryInvoke(() => user.setActivity(status.statusText, {type: status.statusType}));
};

const updateUserProfile = (user: ClientUser, statusCollection: ClientStatus[], usernames: string[]) => {
  setStatus(user, statusCollection);
  setUsername(user, usernames);
}

export const enableActivitySelector = async (
  user: ClientUser,
  statusCollection: ClientStatus[],
  usernames: string[],
  rotationTimeInMs = 45 * 60 * 1000
) => {
  setStatus(user, statusCollection);
  await new Promise(resolve => setTimeout(resolve, 2000));
  setInterval(updateUserProfile, rotationTimeInMs, user, statusCollection, usernames);
};
