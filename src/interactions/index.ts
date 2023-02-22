import {Client, REST, Routes} from 'discord.js';
import {Config} from '../config';
import DotaCustoms from './plugins/dota2';
import CryptoTicker from './plugins/crypto';
import Quote from './plugins/quote';
import Bark from './plugins/bark';
import Markov from './plugins/markov';
import StockTicker from './plugins/stock';
import {EightPepe, SearchPepe, PepeOfTheDay} from './plugins/8pepe';
import SteamAppSearch from './plugins/steam-app';
import WikiSearch from './plugins/wikipedia';

import Robot from './../message';
import {
  CommendInteraction,
  KarmaInteraction,
  ReportInteraction,
} from './plugins/karma';
import {loggerFactory} from '../logging';
import DeleteMessage from './plugins/administration';
// import { EvilButtonPlugin } from './plugins/evilButton';

const interactions = [
  Bark,
  ReportInteraction,
  CommendInteraction,
  KarmaInteraction,
  Quote,
  SteamAppSearch,
  Markov,
  CryptoTicker,
  DotaCustoms,
  StockTicker,
  EightPepe,
  SearchPepe,
  PepeOfTheDay,
  WikiSearch,
  DeleteMessage
];


export default function bindInteractions(client: Client, config: Config) {
  const robotLogger = loggerFactory("Robot");
  /*
  Robot.register(EvilButtonPlugin);
  if(EvilButtonPlugin.onInit) {
    EvilButtonPlugin?.onInit(client, config, loggerFactory("EvilButtonPlugin"));
  }
  */
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
