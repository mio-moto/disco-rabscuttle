import {Client, CommandInteraction, MessageEmbed} from 'discord.js';
import {Config, UploadConfig} from '../../config';
import fetch from 'node-fetch';
import {InteractionPlugin} from '../../message/hooks';
import interactionError from './utils/interaction-error';
import {OHLCDataPoint, rasterize, uploadImage} from './imaging';

type OHLCData = [
  CloseTime: number,
  OpenPrice: number,
  HighPrice: number,
  LowPrice: number,
  ClosePrice: number,
  Volume: number,
  QuoteVolume: number
];

type functor = (m: CommandInteraction) => void;
type APIResult = {
  result: {
    price: {
      last: number;
      high: number;
      low: number;
      change: {
        percentage: number;
        absolute: number;
      };
    };
    volume: number;
    volumeQuote: number;
  };
  allowance: {
    cost: number;
    remaining: number;
    upgrade: string;
  };
};

type Symbols = 'btcusd' | 'dogeusd' | 'ethusd';

const symbolTexts = {
  btcusd: {
    name: 'Bitcoin',
    currency: 'USD',
    symbol: '$',
  },
  dogeusd: {
    name: 'Dogecoin',
    currency: 'USD',
    symbol: '$',
  },
  ethusd: {
    name: 'Ethereum',
    currency: 'USD',
    symbol: '$',
  },
};

let uploadConfig: UploadConfig | null = null;

const emojiSelector = (value: number) => {
  if (value >= 10) {
    return '🚀';
  }
  if (value >= 0) {
    return '📈';
  }
  if (value >= -10) {
    return '📉';
  }
  return '🧱';
};

const call = async (ticker: Symbols, interaction: CommandInteraction) => {
  interaction.defer();
  const summaryPromise = fetch(
    `https://api.cryptowat.ch/markets/kraken/${ticker}/summary`
  );
  const ohlcResponse = await fetch(
    `https://api.cryptowat.ch/markets/kraken/${ticker}/ohlc`
  );
  if (!ohlcResponse.ok) {
    interactionError(
      interaction,
      'Sorry, there was an error getting graph data.'
    );
    return;
  }

  const json = JSON.parse(await ohlcResponse.text()) as {
    result: {'3600': OHLCData[]};
  };

  const dataset: OHLCDataPoint[] = json.result['3600'].slice(-27).map(x => {
    return {
      open: x[1],
      close: x[4],
      high: x[2],
      low: x[3],
      volume: x[5],
    };
  });

  const image = await rasterize(80, dataset);
  const filename = `${ticker}-${+new Date()}.png`;
  const imageUpload = await uploadImage(image, filename, uploadConfig);

  const summary = await summaryPromise;
  if (!summary.ok) {
    interactionError(interaction, 'Sorry, I could not getting summary data.');
    return;
  }

  const summaryResponse = JSON.parse(await summary.text()) as APIResult;

  const close = summaryResponse.result.price.last;
  const low = summaryResponse.result.price.low;
  const high = summaryResponse.result.price.high;

  const range = summaryResponse.result.price.change.absolute;
  const percentage = summaryResponse.result.price.change.percentage * 100;

  const textBits = symbolTexts[ticker];
  const color = percentage < 0 ? 'RED' : 'GREEN';
  const emoji = emojiSelector(percentage);

  const embed = new MessageEmbed()
    .setColor(color)
    .setTitle(
      `${emoji} ${textBits.name} (${textBits.currency}): ${close.toFixed(2)}${
        textBits.symbol
      }`
    )
    .addField(
      '24h Range',
      `${percentage.toFixed(2)}% (${range.toFixed(2)}${textBits.symbol})`,
      true
    )
    .addField(
      'High / Low',
      `${high.toFixed(2)}${textBits.symbol} - ${low.toFixed(2)}${
        textBits.symbol
      }`,
      true
    );
  if (imageUpload.success) {
    embed.setThumbnail(imageUpload.url);
  }

  interaction.followUp('', {embeds: [embed], ephemeral: false});
};

const tickerStrategy: Record<string, functor> = {
  btc: async interaction => {
    return await call('btcusd', interaction);
  },
  doge: async interaction => {
    return await call('dogeusd', interaction);
  },
  eth: async interaction => {
    return await call('ethusd', interaction);
  },
};

const plugin: InteractionPlugin = {
  descriptor: {
    name: 'crypto',
    description: 'Show current crypto exchange rates.',
    options: [
      {
        name: 'coin',
        description: 'Name of coin',
        type: 'STRING',
        required: true,
        choices: [
          {
            name: 'Bitcoin',
            value: 'btc',
          },
          {
            name: 'Dogecoin',
            value: 'doge',
          },
          {
            name: 'Ethereum',
            value: 'eth',
          },
        ],
      },
    ],
  },
  onInit(_: Client, config: Config) {
    uploadConfig = config.uploadConfig;
    console.log('Cryptowatch initialized');
  },
  onNewInteraction(interaction: CommandInteraction) {
    if (!interaction.options[0].value) {
      return;
    }
    const option = <string>interaction.options[0].value;
    tickerStrategy[option](interaction);
  },
};

export default plugin;
