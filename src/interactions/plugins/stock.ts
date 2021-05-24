import {Client, CommandInteraction, MessageEmbed} from 'discord.js';
import fetch from 'node-fetch';
import {Config, UploadConfig} from '../../config';
import {InteractionPlugin} from '../../message/hooks';
import {rasterize, uploadImage, ohlcMax, ohlcMin} from './imaging';
import interactionError from './utils/interaction-error';

let key = '';
let uploadConfig: UploadConfig | null = null;

const INTRA_DAY_ENDPOINT =
  'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol={symbol}&interval=60min&apikey={key}&adjusted=true';

type OHLCDataResponse = {
  [key: string]: {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  };
};

type IntradayResponse = {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval': string;
    '5. Output Size': string;
    '6. Time Zone': string;
  };
  'Time Series (60min)': OHLCDataResponse;
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
  INTRA_DAY_ENDPOINT.replace('{symbol}', symbol).replace('{key}', key);

// from most oldest to most recent datapoint
const getSortedTimeSeries = (timeSeries: OHLCDataResponse): OHLCDataPoint[] => {
  return Object.keys(timeSeries)
    .map(x => {
      const data = timeSeries[x];
      return {
        dateTime: new Date(x + ' GMT'),
        open: parseFloat(data['1. open']),
        high: parseFloat(data['2. high']),
        low: parseFloat(data['3. low']),
        close: parseFloat(data['4. close']),
        volume: parseFloat(data['5. volume']),
      };
    })
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
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
  interaction: CommandInteraction,
  symbol: string
) => {
  const intradayRequest = await fetch(getIntraDayEndpoint(symbol, key));
  if (!intradayRequest.ok) {
    interactionError(interaction, 'Sorry, cannot get any data currently.');
    return;
  }
  const responseText = await intradayRequest.text();
  if (responseText.toLowerCase().includes('error')) {
    interactionError(
      interaction,
      'Sorry, it seems this stock symbol does not exist.'
    );
    return;
  }
  const intradayResponse = JSON.parse(responseText) as IntradayResponse;

  const timeSeries = getSortedTimeSeries(
    intradayResponse['Time Series (60min)']
  );

  const filename = `${symbol}-${Date.now()}.png`;
  const image = rasterize(80, timeSeries.slice(-27));
  const upload = await uploadImage(image, filename, uploadConfig);

  const opening = getMostRecentDayMetrics(timeSeries);

  const open = opening?.open ?? -1;

  if (open < 0) {
    interactionError(
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

  const embed = new MessageEmbed()
    .setColor(open > close ? 'RED' : 'GREEN')
    .setTitle(`${trendEmoji} ${symbol.toUpperCase()} ${close.toFixed(2)}$`)
    .addField(
      'Daily Range',
      `${sign}${percentageChange.toFixed(2)}% (${sign}${priceChange.toFixed(
        2
      )}$)`,
      true
    )
    .addField('High / Low', `${high.toFixed(2)}$ / ${low.toFixed(2)}$`, true);
  if (upload.success) {
    embed.setThumbnail(upload.url);
  }
  interaction.followUp(embed);
};

const plugin: InteractionPlugin = {
  descriptor: {
    name: 'stock',
    description: 'Display intra-day information of stocks.',
    options: [
      {
        type: 'STRING',
        name: 'symbol',
        description: 'Exchange symbol you want to display data for.',
        required: true,
      },
    ],
  },
  onInit(_: Client, config: Config) {
    uploadConfig = config.uploadConfig;
    key = config.alphaVantageKey;
  },
  onNewInteraction(interaction: CommandInteraction) {
    interaction.defer();
    const symbol = <string>interaction.options[0].value;
    reactIntraday(interaction, symbol);
  },
};

export default plugin;
