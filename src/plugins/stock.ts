import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ApplicationCommandOptionType,
} from 'discord.js';
import fetch from 'node-fetch';
import {Config, UploadConfig} from '../config';
import {AutoCompletePlugin, InteractionPlugin} from '../message/hooks';
import {rasterize, uploadImage, ohlcMax, ohlcMin} from './imaging';
import interactionError from './utils/interaction-error';

let key = '';
const keyUsage = 0;
let uploadConfig: UploadConfig | null = null;

const INTRA_DAY_ENDPOINT =
  'https://finnhub.io/api/v1/stock/candle?symbol={symbol}&resolution=15&from=0&to={end}&token={key}';

const SEARCH_ENDPOINT =
  'https://finnhub.io/api/v1/search?q={symbol}&token={key}';

type OHLCDataResponse = {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  s: 'ok' | 'no_data';
  t: number[];
  v: number[];
};

type SearchResponse = {
  count: number;
  result: {
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }[];
};

type OHLCDataPoint = {
  dateTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const getIntraDayEndpoint = (symbol: string, key: string) =>
  INTRA_DAY_ENDPOINT.replace('{symbol}', symbol)
    .replace('{key}', key)
    .replace('{end}', `${Math.floor(Date.now() / 1000)}`);
const getSearchEndpoint = (symbol: string, key: string) =>
  SEARCH_ENDPOINT.replace('{symbol}', symbol).replace('{key}', key);

// from most oldest to most recent datapoint
const getSortedTimeSeries = (timeSeries: OHLCDataResponse): OHLCDataPoint[] => {
  const length = timeSeries.t.length;
  const entries: OHLCDataPoint[] = [];
  for (let i = 0; i < timeSeries.t.length; i++) {
    entries.push({
      dateTime: new Date(timeSeries.t[i] * 1000),
      open: timeSeries.o[i],
      high: timeSeries.h[i],
      low: timeSeries.l[i],
      close: timeSeries.c[i],
      volume: timeSeries.v[i],
    });
  }
  return entries.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
};

const getMostRecentDayMetrics = (datapoints: OHLCDataPoint[]) => {
  const sorted = datapoints.sort(
    (a, b) => a.dateTime.getTime() - b.dateTime.getTime()
  );
  const latest = sorted[sorted.length - 1];
  const beginOfDay = (date: Date) => {
    const timestamp = date.getTime() / 1000;
    return timestamp - (timestamp % 86400);
  };

  return sorted.find(
    x => beginOfDay(x.dateTime) === beginOfDay(latest.dateTime)
  );
};

const reactIntraday = async (
  interaction: ChatInputCommandInteraction,
  symbol: string
) => {
  const uri = getIntraDayEndpoint(symbol, key);
  const intradayRequest = await fetch(uri);
  if (!intradayRequest.ok) {
    await interactionError(
      interaction,
      'Sorry, cannot get any data currently.'
    );
    return;
  }

  const intradayResponse = (await intradayRequest.json()) as OHLCDataResponse;
  if (intradayResponse.s === 'no_data') {
    await interactionError(
      interaction,
      'Sorry, it seems this stock symbol does not exist.'
    );
    return;
  }

  const timeSeries = getSortedTimeSeries(intradayResponse);

  const filename = `${symbol}-${Date.now()}.png`;
  const image = rasterize(80, timeSeries.slice(-27));
  const upload = await uploadImage(image, filename, uploadConfig);

  const opening = getMostRecentDayMetrics(timeSeries);

  const open = opening?.open ?? -1;

  if (open < 0) {
    await interactionError(
      interaction,
      "I made an error that I couldn't recover from."
    );
    return;
  }

  const close = timeSeries[timeSeries.length - 1].close;
  const high = Math.max.apply(
    null,
    timeSeries.map(x => ohlcMax(x))
  );
  const low = Math.min.apply(
    null,
    timeSeries.map(x => ohlcMin(x))
  );

  const trendEmoji = open > close ? '📉' : '📈';

  const priceChange = close - open;
  const percentageChange = (priceChange * 100) / open;
  const sign = priceChange > 0 ? '+' : '';

  const embed = new EmbedBuilder()
    .setColor(open > close ? 'Red' : 'Green')
    .setTitle(`${trendEmoji} ${symbol.toUpperCase()} ${close.toFixed(2)}$`)
    .addFields(
      {
        name: 'Daily Range',
        value: `${sign}${percentageChange.toFixed(
          2
        )}% (${sign}${priceChange.toFixed(2)}$)`,
        inline: true,
      },
      {
        name: 'High / Low',
        value: `${high.toFixed(2)}$ / ${low.toFixed(2)}$`,
        inline: true,
      }
    );
  if (upload.success) {
    embed.setThumbnail(upload.url);
  }
  await interaction.followUp({embeds: [embed]});
};

const plugin: InteractionPlugin & AutoCompletePlugin = {
  name: "Stock",
  descriptor: {
    name: 'stock',
    description: 'Display intra-day information of stocks.',
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'symbol',
        description: 'Exchange symbol you want to display data for.',
        required: true,
        autocomplete: true,
      },
    ],
  },
  onInit: async (_, __, config: Config) => {
    uploadConfig = config.uploadConfig;
    key = config.finnhubApiKey;
  },
  async onNewInteraction(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const symbol = interaction.options.getString('symbol', true);
    await reactIntraday(interaction, symbol);
  },
  async onAutoComplete(interaction: AutocompleteInteraction) {
    const searchString = interaction.options.getString('symbol');
    if (!searchString) {
      await interaction.respond([]);
      return;
    }
    const begin = Date.now();

    (async () => {
      const response = (await (
        await fetch(getSearchEndpoint(searchString, key))
      ).json()) as SearchResponse;
      const results = response.result
        .map(x => {
          const symbol = x.symbol;
          const name = x.description;

          const maxLength = 100 - (symbol.length + 3);
          const displayName = `[${symbol}] ${name.substring(0, maxLength)}`;

          return {
            name: displayName,
            value: x.symbol,
          };
        })
        .splice(0, 25);

      const completion = Date.now();
      const timeTaken = completion - begin;
      if (timeTaken <= 2750) {
        await interaction.respond(results);
      }
    })();
  },
};

export default plugin;
