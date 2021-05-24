import {ActivityType, ClientUser} from 'discord.js';

export type ClientStatus = {
  statusText: string;
  statusType?: ActivityType;
  username: string;
};

const setStatus = (user: ClientUser, statusCollection: ClientStatus[]) => {
  const status =
    statusCollection[Math.floor(Math.random() * statusCollection.length)];
  user.setActivity(status.statusText, {type: status.statusType});
  if (status.username) {
    user.setUsername(status.username);
    console.log(
      `Updating username: ${status.username}, status: ${status.statusType} ${status.statusText}`
    );
    return;
  }
  console.log(`Updating status: ${status.statusType} ${status.statusText}`);
};

export const enableActivitySelector = async (
  user: ClientUser,
  statusCollection: ClientStatus[],
  rotationTimeInMs = 2 * 60 * 60 * 1000
) => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  setInterval(setStatus, rotationTimeInMs, user, statusCollection);
};
