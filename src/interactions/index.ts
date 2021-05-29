import {Client} from 'discord.js';
import {Config} from '../config';
import DotaCustoms from './plugins/dota2';
import CryptoTicker from './plugins/crypto';
import Quote from './plugins/quote';
import Bark from './plugins/bark';
import Markov from './plugins/markov';
import StockTicker from './plugins/stock';

import Robot from './../message';
import {
  CommendInteraction,
  KarmaInteraction,
  ReportInteraction,
} from './plugins/karma';
import {loggerFactory} from '../logging';

const interactions = [
  Bark,
  ReportInteraction,
  CommendInteraction,
  KarmaInteraction,
  Quote,
  Markov,
  CryptoTicker,
  DotaCustoms,
  StockTicker,
];

export default function bindInteractions(client: Client, config: Config) {
  interactions.forEach(x => {
    client.guilds.cache.forEach(async y => {
      y.commands.create(x.descriptor);
    });
    Robot.register(x);
    if (x.onInit) {
      const logger = loggerFactory(x.descriptor.name);
      x.onInit(client, config, logger);
      logger.info(`${x.descriptor.name} initialized`);
    }
  });
}
