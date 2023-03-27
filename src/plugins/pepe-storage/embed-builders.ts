import {EmbedBuilder} from 'discord.js';
import {
  GachaHit,
  NormalHit,
  OwnerInfo,
  PepeIconData,
  RareHit,
  Rarity,
  UltraHit,
} from '.';

const Platin = '#c3e2ff';

export function embedNormalOrRareEightPepe(
  message: string | null,
  hit: Exclude<GachaHit, UltraHit>,
  icons: PepeIconData
) {
  switch (hit.rarity) {
    case Rarity.normal:
      return embedNormal(message, hit);
    case Rarity.rare:
      return embedRare(icons.rare, hit);
  }
}

export const embedNormal = (message: string | null, pepe: NormalHit) => {
  const embed = new EmbedBuilder().setImage(pepe.value);
  if (message) {
    embed.setFooter({text: message});
  }
  return embed;
};

export const embedRare = (rareIcon: string, pepe: RareHit) =>
  new EmbedBuilder()
    .setAuthor({
      name: 'A RARE PEPE',
      iconURL: rareIcon,
    })
    .setImage(pepe.value)
    .setColor('Gold');

export const embedUltra = (
  ultraIcon: string,
  owner: OwnerInfo,
  pepe: UltraHit
) =>
  new EmbedBuilder()
    .setTitle(`${pepe.value.name} ${pepe.value.number}`)
    .setColor(Platin)
    .setTimestamp(Date.parse(owner.timestamp))
    .setImage(pepe.value.vid)
    .setAuthor({name: 'ＵＬＴＲＡ ＲＡＲＥ', iconURL: ultraIcon})
    .setFooter({text: `Unlocked by ${owner.ownerName}`});

export const embedPepeOfTheDay = (
  hit: GachaHit,
  icons: PepeIconData,
  day: Date,
  dayText: string
) => {
  switch (hit.rarity) {
    case Rarity.normal:
      return embedNormalPepeOfTheDay(hit, icons.normal, day, dayText);
    case Rarity.rare:
      return embedRarePepeOFTheDay(hit, icons.rare, day, dayText);
    case Rarity.ultra:
      return embedUltraPepeOfTheDay(hit, icons.ultra, day, dayText);
  }
};

const embedUltraPepeOfTheDay = (
  hit: UltraHit,
  ultraIcon: string,
  day: Date,
  dayText: string
) =>
  new EmbedBuilder()
    .setColor(Platin)
    .setImage(hit.value.vid)
    .setTimestamp(day)
    .setFooter({
      text: `ＵＬＴＲＡ ＰＥＰＥ ＯＦ ＴＨＥ ＤＡＹ - ${hit.value.number}: ${hit.value.name}`,
    })
    .setTitle(dayText);

const embedRarePepeOFTheDay = (
  hit: RareHit,
  rareIcon: string,
  day: Date,
  dayText: string
) =>
  new EmbedBuilder()
    .setColor('Gold')
    .setImage(hit.value)
    .setTimestamp(day)
    .setFooter({text: 'Rare Pepe of the Day!', iconURL: rareIcon})
    .setTitle(dayText);

const embedNormalPepeOfTheDay = (
  hit: NormalHit,
  normalIcon: string,
  day: Date,
  dayText: string
) =>
  new EmbedBuilder()
    .setColor('Green')
    .setImage(hit.value)
    .setTimestamp(day)
    .setFooter({text: 'Pepe of the Day', iconURL: normalIcon})
    .setTitle(dayText);

export const embedPepeSearchResult = (imageUrl: string, name: string) =>
  new EmbedBuilder().setTitle(name).setURL(imageUrl).setImage(imageUrl);
