import {AutocompleteInteraction, Client, ChatInputCommandInteraction, EmbedBuilder, ApplicationCommandOptionType} from 'discord.js';
import {Config, UploadConfig} from '../config';
import fetch from 'node-fetch';
import {AutoCompletePlugin, InteractionPlugin} from '../message/hooks';
import interactionError from './utils/interaction-error';
import {OHLCDataPoint, rasterize, uploadImage} from './imaging';
import {Logger} from 'winston';

type OHLCData = [
  CloseTime: number,
  OpenPrice: number,
  HighPrice: number,
  LowPrice: number,
  ClosePrice: number,
  Volume: number,
  QuoteVolume: number
];

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
    upgrade: String;
  };
};

type Symbols = typeof coins[number]['value'];

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
  if(value >= -15) {
    return '🧱';
  }
  return '🦽';
};

const call = async (ticker: Symbols, interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();
  const summaryPromise = fetch(
    `https://api.cryptowat.ch/markets/kraken/${ticker}/summary`
  );
  const ohlcResponse = await fetch(
    `https://api.cryptowat.ch/markets/kraken/${ticker}/ohlc`
  );
  if (!ohlcResponse.ok) {
    await interactionError(interaction, 'Sorry, there was an error getting graph data.');
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
    await interactionError(interaction, 'Sorry, I could not get summary data.');
    return;
  }

  const summaryResponse = JSON.parse(await summary.text()) as APIResult;

  const close = summaryResponse.result.price.last;
  const low = summaryResponse.result.price.low;
  const high = summaryResponse.result.price.high;

  const range = summaryResponse.result.price.change.absolute;
  const percentage = summaryResponse.result.price.change.percentage * 100;

  const textBits = coins.find(x => x.value === ticker);
  if (!textBits) {
    await interactionError(interaction, 'Sorry, I could not find that coin.');
    return;
  }
  const currency = '$';
  const symbol = textBits.value.replace('btc', '').toUpperCase();
  const color = percentage < 0 ? 'Red' : 'Green';
  const emoji = emojiSelector(percentage);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(
      `${emoji} ${textBits.name} (${symbol}): ${close.toFixed(2)}${currency}`
    )
    .addFields({
      name: '24h Range',
      value: `${percentage.toFixed(2)}% (${range.toFixed(2)}${currency})`,
      inline: true
    }, {
      name: 'High / Low',
      value: `${high.toFixed(2)}${currency} - ${low.toFixed(2)}${currency}`,
      inline: true
    })
  if (imageUpload.success) {
    embed.setThumbnail(imageUpload.url);
  }

  await interaction.followUp({embeds: [embed]});
};

const coins = [
  {value: 'btcusd', name: 'Bitcoin'},
  {value: 'ethusd', name: 'Ethereum'},
  {value: 'maticusd', name: 'Polygon'},
  {value: 'adausd', name: 'Cardano'},
  {value: 'dogeusd', name: 'Dogecoin'},
  {value: 'xrpusd', name: 'Ripple'},
  {value: 'dotusd', name: 'Polkadot'},
  {value: 'etcusd', name: 'Ethereum Classic'},
  {value: 'ltcusd', name: 'Litecoin'},
  {value: 'linkusd', name: 'Chainlink'},
  {value: 'eosusd', name: 'EOSIO'},
  {value: 'filusd', name: 'Filecoin'},
  {value: 'bchusd', name: 'Bitcoin Cash'},
  {value: 'trxusd', name: 'TRON'},
  {value: 'xlmusd', name: 'Lumen'},
  {value: 'uniusd', name: 'Uniswap'},
  {value: 'sushiusd', name: 'Sushiswap'},
  {value: 'aaveusd', name: 'Aave'},
  {value: 'gnousd', name: 'Gnosis'},
  {value: 'repusd', name: 'Augur (REP)'},
  {value: 'zecusd', name: 'Zcash'},
  {value: 'xmrusd', name: 'Monero'},
  {value: 'dashusd', name: 'Dash'},
  {value: 'usdtusd', name: 'Tether'},
  {value: 'qtumusd', name: 'Qtum'},
  {value: 'xtzusd', name: 'Tezos'},
  {value: 'atomusd', name: 'Cosmos'},
  {value: 'batusd', name: 'Basic Attention'},
  {value: 'wavesusd', name: 'Waves'},
  {value: 'icxusd', name: 'ICON'},
  {value: 'scusd', name: 'Siacoin'},
  {value: 'omgusd', name: 'OMG Network'},
  {value: 'paxgusd', name: 'Paxos Gold'},
  {value: 'nanousd', name: 'Nano'},
  {value: 'lskusd', name: 'Lisk'},
  {value: 'daiusd', name: 'Dai'},
  {value: 'mlnusd', name: 'Enzyme Finance'},
  {value: 'usdcusd', name: 'USD Coin'},
  {value: 'algousd', name: 'Algorand'},
  {value: 'oxtusd', name: 'Orchid'},
  {value: 'kavausd', name: 'Kava'},
  {value: 'storjusd', name: 'Storj'},
  {value: 'compusd', name: 'Compound'},
  {value: 'kncusd', name: 'Kyber Network'},
  {value: 'repv2usd', name: 'Augur V2'},
  {value: 'snxusd', name: 'Synthetix'},
  {value: 'crvusd', name: 'Curve DAO Token'},
  {value: 'balusd', name: 'Balancer'},
  {value: 'ksmusd', name: 'Kusama'},
  {value: 'yfiusd', name: 'Yearn Finance'},
  {value: 'keepusd', name: 'Keep Network'},
  {value: 'antusd', name: 'Aragon'},
  {value: 'tbtcusd', name: 'tBTC'},
  {value: 'manausd', name: 'Decentraland'},
  {value: 'grtusd', name: 'Graph'},
  {value: 'flowusd', name: 'Flow'},
  {value: 'ewtusd', name: 'Energy Web Token'},
  {value: 'oceanusd', name: 'OCEAN'},
  {value: 'zrxusd', name: '0x'},
  {value: 'renusd', name: 'Ren'},
  {value: 'ghstusd', name: 'Aavegotchi'},
  {value: 'rariusd', name: 'Rarible'},
  {value: 'sandusd', name: 'Sand'},
  {value: 'enjusd', name: 'Enjin'},
  {value: 'lptusd', name: 'Livepeer'},
  {value: 'ankrusd', name: 'Ankr'},
  {value: 'bntusd', name: 'Bancor'},
];

export const fuzzyMatch = (input: string, comparison: string) => {
  input = input.toLowerCase();
  comparison = comparison.toLowerCase();
  const inputCharacters = Array.from(input);
  const comparisonCharacters = Array.from(comparison);

  while(true) {
    const character = inputCharacters.shift();
    if(!character) {
      return true;
    }
    if(!comparisonCharacters.includes(character)) {
      return false;
    }
    const index = comparisonCharacters.indexOf(character);
    comparisonCharacters.splice(index, 1);
  }
}

const findMatches = (coin: string) => {
  return coins.filter(x => fuzzyMatch(coin, x.name) || fuzzyMatch(coin, x.value));
}


const plugin: InteractionPlugin & AutoCompletePlugin = {
  descriptor: {
    name: 'crypto',
    description: 'Show current crypto exchange rates.',
    
    options: [{
      name: 'coin',
      description: 'Enter the coin you want to track',
      type: ApplicationCommandOptionType.String,
      autocomplete: true,
      required: true
    }],
  },
  onInit: async (_, __, config) => {
    uploadConfig = config.uploadConfig;
  },
  async onNewInteraction(interaction: ChatInputCommandInteraction) {
    const coinName = interaction.options.getString('coin');
    if (!coinName) {
      return;
    }
    await call(coinName, interaction);
  },
  async onAutoComplete(interaction: AutocompleteInteraction) {
    const coin = interaction.options.getString('coin')?.trim() || '';
    const candidates = findMatches(coin).splice(0, 24);
    await interaction.respond(candidates);
  }
};

export default plugin;
