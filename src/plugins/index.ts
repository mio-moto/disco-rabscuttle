import { PepeOfTheDay, SearchPepe } from './8pepe'
import DeleteMessage from './administration'
import AI from './ai-detector'
import Bark from './bark'
import CryptoTicker from './crypto'
import DotaCustoms from './dota2'
import { ThreeCardMonte } from './games'
import { CommendInteraction, KarmaInteraction, ReportInteraction } from './karma'
import Quote from './quote'
import RedditProtest from './reddit-protest'
import { reminderPlugin } from './reminder'
import SteamAppSearch from './steam-app'
import StockTicker from './stock'
import WikiSearch from './wikipedia'

export const interactions = [
  AI,
  Bark,
  ReportInteraction,
  CommendInteraction,
  KarmaInteraction,
  Quote,
  SteamAppSearch,
  CryptoTicker,
  DotaCustoms,
  StockTicker,
  SearchPepe,
  PepeOfTheDay,
  WikiSearch,
  DeleteMessage,
  ThreeCardMonte,
  RedditProtest,
  reminderPlugin,
]
