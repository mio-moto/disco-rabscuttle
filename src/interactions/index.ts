import {Config} from '../config';
import DotaCustoms from './plugins/dota2';
import CryptoTicker from './plugins/crypto';
import Quote from './plugins/quote';
import Bark from './plugins/bark';
import Markov from './plugins/markov';
import StockTicker from './plugins/stock';
import {EightPepe, SearchPepe} from './plugins/8pepe';
import SteamAppSearch from './plugins/steam-app';
import WikiSearch from './plugins/wikipedia';

import Robot from './../message';
import {
  CommendInteraction,
  KarmaInteraction,
  ReportInteraction,
} from './plugins/karma';
import {loggerFactory} from '../logging';
import { DiscordClient } from '../robot';
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
  WikiSearch
];

export default function bindInteractions(client: DiscordClient, config: Config) {
  const robotLogger = loggerFactory("Robot");
  /*
  Robot.register(EvilButtonPlugin);
  if(EvilButtonPlugin.onInit) {
    EvilButtonPlugin?.onInit(client, config, loggerFactory("EvilButtonPlugin"));
  }
  */
  interactions.forEach(x => {
    client.restClient.registerCommand(x.descriptor);
    Robot.register(x);
    if (x.onInit) {
      const logger = loggerFactory(x.descriptor.name);
      x.onInit(client, config, logger);
    }
    robotLogger.info(`${x.descriptor.name} initialized`);
  });
}
