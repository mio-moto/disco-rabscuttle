import {Client} from 'discord.js';
import {Config} from '../config';
import DotaCustoms from './plugins/dota2';
import CryptoTicker from './plugins/crypto';
import Quote from './plugins/quote';
import Bark from './plugins/bark';
import Markov from './plugins/markov';
import StockTicker from './plugins/stock';
import {EightPepe, SearchPepe} from './plugins/8pepe';

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
  EightPepe,
  SearchPepe
];

export default function bindInteractions(client: Client, config: Config) {
  const robotLogger = loggerFactory("Robot");
  interactions.forEach(x => {
    client.guilds.cache.forEach(async y => {
      y.commands.create(x.descriptor);
    });
    Robot.register(x);
    if (x.onInit) {
      const logger = loggerFactory(x.descriptor.name);
      x.onInit(client, config, logger);
    }
    robotLogger.info(`${x.descriptor.name} initialized`);
  });
}
