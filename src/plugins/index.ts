import DotaCustoms from './dota2';
import CryptoTicker from './crypto';
import Quote from './quote';
import Bark from './bark';
import Markov from './markov';
import StockTicker from './stock';
import {EightPepe, SearchPepe, PepeOfTheDay, PepeThis} from './8pepe';
import SteamAppSearch from './steam-app';
import WikiSearch from './wikipedia';
import {CommendInteraction, KarmaInteraction, ReportInteraction} from './karma';
import DeleteMessage from './administration';
import { TheButtonPlugin } from './the-button';
import { ThreeCardMonte } from './games';
import RedditProtest from "./reddit-protest";

export const interactions = [
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
  PepeThis,
  WikiSearch,
  DeleteMessage,
  TheButtonPlugin,
  ThreeCardMonte,
  RedditProtest,
];
