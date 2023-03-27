import {Logger} from 'winston';

export const tryInvoke = (action: () => void, logger?: Logger) => {
  try {
    action();
  } catch (e) {
    logger?.error(e);
  }
};
