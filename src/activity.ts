import { ActivityOptions, ActivityType, Client, ClientUser } from 'discord.js';
import { tryInvoke } from './utils';

export type ClientStatus = {
  statusText: string,
  statusType?: ActivityType
};

const random = (stuff: any[]) =>
  stuff[Math.floor(Math.random() * stuff.length)];

const createStatusOption = (status: ClientStatus): ActivityOptions | undefined => {
  if (!("statusType" in status) || status.statusType === ActivityType.Custom) {
    return;
  }
  return { type: status.statusType! }
}

export const setUsername = (user: ClientUser, username: string) =>
  tryInvoke(() => user.setUsername(username));
export const setStatus = (user: ClientUser, status: ClientStatus) =>
  tryInvoke(() => user.setActivity(status.statusText, createStatusOption(status)));

export const setRandomUsername = (user: ClientUser, usernames: string[]) =>
  tryInvoke(() => user.setUsername(random(usernames)));
export const setRandomStatus = (user: ClientUser, statusCollection: ClientStatus[]) => {
  const status = random(statusCollection);
  tryInvoke(() => user.setActivity(status.statusText, createStatusOption(random(statusCollection))));
};

const updateUserProfile = (client: Client, statusCollection: ClientStatus[], usernames: string[]) => {
  const user = client.user;
  if(!user) {
    return;
  }
  
  setRandomStatus(user, statusCollection);
  setRandomUsername(user, usernames);
}

export const enableActivitySelector = async (
  client: Client,
  statusCollection: ClientStatus[],
  usernames: string[],
  rotationTimeInMs = 45 * 60 * 1000
) => {
  if(client.user) {
    setRandomStatus(client.user, statusCollection);
  }
  await new Promise(resolve => setTimeout(resolve, 2000));
  return setInterval(updateUserProfile, rotationTimeInMs, client, statusCollection, usernames);
};


export const buildActivitySystem = (client: Client) => {
  let timer: NodeJS.Timer | undefined = undefined;

  return {
    enabled: () => !!timer,
    enableActivitySelector: async (
      statusCollection: ClientStatus[],
      usernames: string[],
      rotationTimeInMs = 45 * 60 * 1000
    ) => timer = await enableActivitySelector(client, statusCollection, usernames, rotationTimeInMs),
    disableActivitySelector: clearInterval(timer)
  }
}