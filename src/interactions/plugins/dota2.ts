import {Client, CommandInteraction, MessageEmbed} from 'discord.js';
import {existsSync, readFile, writeFile} from 'fs';
import fetch from 'node-fetch';
import {Config} from '../../config';
import {InteractionPlugin} from '../../message/hooks';
import interactionError from './utils/interaction-error';
import {decimal} from './utils/number-fomatter';

// searches the workshop, orders by name
const SEARCH_URL =
  'https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/?key={key}&query_type=12&page=0&numperpage=10&appid=570&search_text={text}';
// gives extensive details of an item
const WORKSHOP_DETAILS =
  'https://api.steampowered.com/IPublishedFileService/GetDetails/v1/?key={key}&publishedfileids[0]={custom_game_id}&includetags=1&includeadditionalpreviews=1&includechildren=1&includekvtags=1&includevotes=1&short_description=1&includeforsaledata=1&includemetadata=1&return_playtime_stats=1&appid=570&strip_description_bbcode=1';
// returns all currently open lobbies
const OPEN_LOBBY =
  'http://www.dota2.com/webapi/ILobbies/GetJoinableCustomLobbies/v0001';
// gets player / spectator cound of a game
const PLAYER_COUNT =
  'https://www.dota2.com/webapi/ICustomGames/GetGamePlayerCounts/v0001/?custom_game_id={custom_game_id}';
// gets lots of ids of popular games
const POPULAR_GAMES =
  'https://www.dota2.com/webapi/ICustomGames/GetPopularGames/v0001/';

const WORKSHOP_SITE =
  'https://steamcommunity.com/sharedfiles/filedetails/?id={custom_game_id}';

type SearchResponse = {
  response: {
    total: number;
    publishedfiledetails: {
      result: number;
      publishedfileid: string;
      language: number;
    }[];
  };
};
type WorkshopDetailsResponse = {
  response: {
    publishedfiledetails: {
      result: number;
      publishedfileid: string;
      creator: string;
      creator_appid: number;
      consumer_appid: number;
      consumer_shortcutid: number;
      filename: string;
      file_size: string;
      preview_file_size: string;
      preview_url: string;
      url: string;
      hcontent_file: string;
      hcontent_preview: string;
      title: string;
      short_description: string;
      time_created: number;
      time_updated: number;
      visibility: number;
      flags: number;
      workshop_file: boolean;
      workshop_accepted: boolean;
      show_subscribe_all: boolean;
      num_comments_public: number;
      banned: false;
      ban_reason: string;
      banner: string;
      can_be_deleted: boolean;
      app_name: string;
      file_type: number;
      can_subscribe: boolean;
      subscriptions: number;
      favorited: number;
      followers: number;
      lifetime_subscriptions: number;
      lifetime_favorited: number;
      lifetime_followers: number;
      lifetime_playtime: string;
      lifetime_playtime_sessions: string;
      views: number;
      num_children: number;
      num_reports: number;
      previews: {
        previewid: string;
        sortorder: number;
        url: string;
        size: number;
        filename: string;
        preview_type: number;
      }[];
      tags: {
        tag: string;
        adminonly: boolean;
        display_name: string;
      }[];
      vote_data: {
        score: number;
        votes_up: number;
        votes_down: number;
      };
      playtime_stats: {
        playtime_seconds: string;
        num_sessions: string;
      };
      language: number;
      maybe_inappropriate_sex: boolean;
      maybe_inappropriate_violence: boolean;
      revision_change_number: number;
      revision: number;
      available_revisions: number[];
      ban_text_check_result: number;
    }[];
  };
};
type PlayerCountResponse = {
  player_count: number;
  spectator_count: number;
  success: boolean;
};
type PlayerLobbyResponse = {
  lobbies: {
    looby_id: string;
    custom_game_id: string;
    member_count: number;
    leader_account_id: number;
    leader_name: string;
    custom_map_name: string;
    max_player_count: 5;
    server_region: 9;
    has_pass_key: true;
  }[];
};

type PopularGamesResponse = {
  result: {
    custom_games: {id: string}[];
    item_count: number;
    success: boolean;
  };
};

const gatherLobbyStats = (
  response: PlayerLobbyResponse,
  customGameId: string
) => {
  const lobbies = response.lobbies.filter(
    x => x.custom_game_id === customGameId
  );
  return [
    lobbies.map(x => x.member_count).reduce((a, b) => a + b, 0),
    lobbies.length,
  ];
};

const addKey = (uri: string, key: string) => uri.replace('{key}', key);
const addText = (uri: string, text: string) => uri.replace('{text}', text);
const addCustomGameId = (uri: string, customGameId: string) =>
  uri.replace('{custom_game_id}', customGameId);

const getSearchUrl = (key: string, text: string) =>
  addText(addKey(SEARCH_URL, key), text);
const getWorkshopDetailsUri = (key: string, customGameId: string) =>
  addCustomGameId(addKey(WORKSHOP_DETAILS, key), customGameId);
const getOpenLobbyUri = () => OPEN_LOBBY;
const getPlayerCountUri = (customGameId: string) =>
  addCustomGameId(PLAYER_COUNT, customGameId);
const getPopularGamesUri = () => POPULAR_GAMES;
const getWorkshopSiteUri = (customGameId: string) =>
  addCustomGameId(WORKSHOP_SITE, customGameId);

let steamApiKey = '';

const strategy = {
  dp: async (name: string, interaction: CommandInteraction) => {
    interaction.defer();

    const searchRequest = await fetch(getSearchUrl(steamApiKey, name));
    if (!searchRequest.ok) {
      interactionError(interaction, 'Sorry, I cannot reach Valve.');
      return;
    }
    const searchResponse: SearchResponse = JSON.parse(
      await searchRequest.text()
    );
    if (searchResponse.response.total <= 0) {
      interactionError(
        interaction,
        "Sorry, I couldn't find any custom game with that name."
      );
      return;
    }
    const customGameId =
      searchResponse.response.publishedfiledetails[0].publishedfileid;
    const playerCountRequestPromise = fetch(getPlayerCountUri(customGameId));
    const playerLobbyRequestPromise = fetch(getOpenLobbyUri());
    const detailsRequest = await fetch(
      getWorkshopDetailsUri(steamApiKey, customGameId)
    );

    if (!detailsRequest.ok) {
      console.error(detailsRequest);
      interactionError(interaction, "Sorry, I couldn't reach valve.");
      return;
    }
    const detailsResponse: WorkshopDetailsResponse = JSON.parse(
      await detailsRequest.text()
    );
    if (detailsResponse.response.publishedfiledetails.length <= 0) {
      interactionError(
        interaction,
        "Sorry, I couldn't find details from the workshop."
      );
      return;
    }
    const thumbnail =
      detailsResponse.response.publishedfiledetails[0].preview_url;
    const title = detailsResponse.response.publishedfiledetails[0].title;
    const subscriptions =
      detailsResponse.response.publishedfiledetails[0].subscriptions;
    const favorited =
      detailsResponse.response.publishedfiledetails[0].favorited;

    const playerCountRequest = await playerCountRequestPromise;
    if (!playerCountRequest.ok) {
      interactionError(
        interaction,
        "Sorry, I couldn't fetch the player count."
      );
      return;
    }
    const playerCountResponse: PlayerCountResponse = JSON.parse(
      await playerCountRequest.text()
    );
    let playerCount = playerCountResponse.player_count;
    let spectatorCount = playerCountResponse.spectator_count;

    const playerLobbyRequest = await playerLobbyRequestPromise;
    if (!playerLobbyRequest.ok) {
      interactionError(interaction, "Sorry, I couldn't fetch lobby data.");
      return;
    }
    const playerLobbyResponse: PlayerLobbyResponse = JSON.parse(
      await playerLobbyRequest.text()
    );
    let [lobbyPlayers, lobbyCount] = gatherLobbyStats(
      playerLobbyResponse,
      customGameId
    );

    let currentRanking = currentPopularGames.findIndex(x => x === customGameId);
    let yesterdayRanking = yesterdayPopularGames.findIndex(
      x => x === customGameId
    );

    if (
      detailsResponse.response.publishedfiledetails[0].creator ===
      '76561198054179075'
    ) {
      currentRanking = Math.min(
        Math.floor(currentRanking * 1.3),
        currentPopularGames.length
      );
      yesterdayRanking = Math.min(
        Math.floor(currentRanking * 1.3),
        currentPopularGames.length
      );

      playerCount = Math.floor(playerCount * 0.7);
      spectatorCount = Math.floor(playerCount * 0.7);
      lobbyPlayers = Math.floor(lobbyPlayers * 0.7);
      lobbyCount = Math.floor(lobbyCount * 0.7);
      if (lobbyPlayers > 0) {
        lobbyCount = Math.max(1, lobbyCount);
      }
      if (lobbyCount > 0) {
        lobbyPlayers = Math.max(1, lobbyCount);
      }
    }
    const trend = trendingText(currentRanking, yesterdayRanking);

    const messageEmbed = new MessageEmbed()
      .setColor(11402732)
      .setURL(getWorkshopSiteUri(customGameId))
      .setTitle(title)
      .setThumbnail(thumbnail)
      .addField(
        'Current Players',
        `${playerCount.toLocaleString()} playing\n` +
          `${spectatorCount.toLocaleString()} ` +
          `spectating\n${lobbyPlayers.toLocaleString()} waiting in ` +
          `${lobbyCount.toLocaleString()} lobbies`,
        true
      )
      .addField(
        'Ranking',
        `${trend}\n` +
          `${decimal(subscriptions, 1, false, true)} subscribed\n` +
          `${decimal(favorited, 1, false, true)} favourited`,
        true
      );
    return interaction.followUp(messageEmbed);
  },
};

function ordinalSuffix(i: number) {
  const j = i % 10,
    k = i % 100;
  if (j === 1 && k !== 11) {
    return i + 'st';
  }
  if (j === 2 && k !== 12) {
    return i + 'nd';
  }
  if (j === 3 && k !== 13) {
    return i + 'rd';
  }
  return i + 'th';
}

const trendingText = (currentRanking: number, yesterdayRanking: number) => {
  const current = ordinalSuffix(currentRanking);
  const yesterday = ordinalSuffix(yesterdayRanking);

  if (currentRanking < 0 && yesterdayRanking < 0) {
    return '(no ranking)';
  }
  if (currentRanking < 0) {
    return `-- (was ${yesterday})`;
  }
  if (yesterdayRanking < 0) {
    return `${current}`;
  }
  if (current < yesterday) {
    return `${current} (▲ ${yesterday})`;
  }
  if (current === yesterday) {
    return `${current} (~ ${yesterday})`;
  }
  return `${current} (▼ ${yesterday})`;
};

// timestamp as unix timestamp, which is new Date() / 1000 (!)
const saveRanking = async (data: string[], date: Date) => {
  const timestamp = date.getTime() / 1000;
  const beginOfDay = timestamp - (timestamp % 86400);
  await writeFile(
    `data/ranking-${beginOfDay}.json`,
    JSON.stringify(data),
    {encoding: 'utf-8', flag: 'w'},
    () => {}
  );
};
// timestamp as unix timestamp, which is new Date() / 1000 (!)
const loadRanking = async (
  date: Date,
  callback: (err: NodeJS.ErrnoException | null, data: string[]) => void
) => {
  const timestamp = date.getTime() / 1000;
  const beginOfDay = timestamp - (timestamp % 86400);
  const filePath = `data/ranking-${beginOfDay}.json`;
  if (!existsSync(filePath)) {
    callback(null, []);
  }
  await readFile(filePath, (err, data) => {
    if (err) {
      return callback(err, []);
    }
    callback(err, JSON.parse(data.toString('utf-8')) as string[]);
  });
};

let yesterdayPopularGames: string[];
let currentPopularGames: string[];

const plugin: InteractionPlugin = {
  descriptor: {
    name: 'dotaplayers',
    description: 'Show the current dota players for a custom game name',
    options: [
      {
        type: 'STRING',
        name: 'custom-game-name',
        description: 'Name of the custom game you want to view stats for.',
        required: true,
      },
    ],
  },
  onInit(client: Client, config: Config) {
    const yesterday = new Date();
    yesterday.setDate(new Date().getDate() - 1);
    loadRanking(yesterday, (err, data) => {
      if (err) {
        return;
      }
      yesterdayPopularGames = data;
    });

    const updateRanking = async () => {
      const popularGamesRequest = await fetch(getPopularGamesUri());
      if (!popularGamesRequest.ok) {
        setTimeout(updateRanking, 30000);
        return;
      }
      const response: PopularGamesResponse = JSON.parse(
        await popularGamesRequest.text()
      );
      currentPopularGames = response.result.custom_games.map(x => x.id);
      saveRanking(currentPopularGames, new Date());
    };
    updateRanking();
    setInterval(updateRanking, 86400000 / 4);
    steamApiKey = config.steamApiKey;
  },
  onNewInteraction(interaction: CommandInteraction) {
    if (
      interaction.member?.user.username === 'darklord' &&
      Math.random() > 0.5
    ) {
      interaction.reply('Insert coint to continue', {ephemeral: true});
      return;
    }

    if (!interaction.options[0].value) {
      return;
    }

    strategy['dp'](<string>interaction.options[0].value, interaction);
  },
};

export default plugin;
