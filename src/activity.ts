import { ActivityType, PresenceUpdateStatus } from 'discord-api-types/v10';
import { DiscordClient, GatewayClient, RestClient } from './robot';
import { tryInvoke } from './utils';

export type ClientStatus = {
  statusText: string;
  statusType?: ActivityType;
};

const random = (stuff: any[]) =>
  stuff[Math.floor(Math.random() * stuff.length)];

const setUsername = (rest: RestClient, usernames: string[]) => tryInvoke(() => rest.modifyUser({ username: random(usernames)}));

const setStatus = (gateway: GatewayClient ,statusCollection: ClientStatus[]) => {
  const status = random(statusCollection);
  tryInvoke(() => gateway.updatePresence({
    since: null,
    status: PresenceUpdateStatus.Online,
    afk: false,
    activities: [{
      name: status.statusText,
      type: status.statusType
    }]
  }));
};

const updateUserProfile = (client: DiscordClient, statusCollection: ClientStatus[], usernames: string[]) => {
  setStatus(client.gateway, statusCollection);
  setUsername(client.restClient, usernames);
}

export const enableActivitySelector = async (
  client: DiscordClient,
  statusCollection: ClientStatus[],
  usernames: string[],
  rotationTimeInMs = 45 * 60 * 1000
) => {
  setStatus(client.gateway, statusCollection);
  await new Promise(resolve => setTimeout(resolve, 2000));
  setInterval(updateUserProfile, rotationTimeInMs, client, statusCollection, usernames);
};
