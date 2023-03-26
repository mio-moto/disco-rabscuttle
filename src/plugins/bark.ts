import {Client, ChatInputCommandInteraction} from 'discord.js';
import {InteractionPlugin} from '../message/hooks';
import {Config} from '../config';

const tools = [
  'JS',
  'TypeScript',
  'ModDota',
  'IRC',
  'Discord',
  'toilet',
  'Panorama',
  'Lua',
];

const reaction = [
  'watch weeb shit',
  'code',
  'shut the fuck up',
  'rub ${random} nippels',
  'listen to ${random}, you little shit',
  'chillax',
];

const languages = [
  {code: 'ab', name: 'Abkhaz', nativeName: 'аҧсуа'},
  {code: 'aa', name: 'Afar', nativeName: 'Afaraf'},
  {code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans'},
  {code: 'ak', name: 'Akan', nativeName: 'Akan'},
  {code: 'sq', name: 'Albanian', nativeName: 'Shqip'},
  {code: 'am', name: 'Amharic', nativeName: 'አማርኛ'},
  {code: 'ar', name: 'Arabic', nativeName: 'العربية'},
  {code: 'an', name: 'Aragonese', nativeName: 'Aragonés'},
  {code: 'hy', name: 'Armenian', nativeName: 'Հայերեն'},
  {code: 'as', name: 'Assamese', nativeName: 'অসমীয়া'},
  {code: 'av', name: 'Avaric', nativeName: 'авар мацӀ, магӀарул мацӀ'},
  {code: 'ae', name: 'Avestan', nativeName: 'avesta'},
  {code: 'ay', name: 'Aymara', nativeName: 'aymar aru'},
  {code: 'az', name: 'Azerbaijani', nativeName: 'azərbaycan dili'},
  {code: 'bm', name: 'Bambara', nativeName: 'bamanankan'},
  {code: 'ba', name: 'Bashkir', nativeName: 'башҡорт теле'},
  {code: 'eu', name: 'Basque', nativeName: 'euskara, euskera'},
  {code: 'be', name: 'Belarusian', nativeName: 'Беларуская'},
  {code: 'bn', name: 'Bengali', nativeName: 'বাংলা'},
  {code: 'bh', name: 'Bihari', nativeName: 'भोजपुरी'},
  {code: 'bi', name: 'Bislama', nativeName: 'Bislama'},
  {code: 'bs', name: 'Bosnian', nativeName: 'bosanski jezik'},
  {code: 'br', name: 'Breton', nativeName: 'brezhoneg'},
  {code: 'bg', name: 'Bulgarian', nativeName: 'български език'},
  {code: 'my', name: 'Burmese', nativeName: 'ဗမာစာ'},
  {code: 'ca', name: 'Catalan; Valencian', nativeName: 'Català'},
  {code: 'ch', name: 'Chamorro', nativeName: 'Chamoru'},
  {code: 'ce', name: 'Chechen', nativeName: 'нохчийн мотт'},
  {
    code: 'ny',
    name: 'Chichewa; Chewa; Nyanja',
    nativeName: 'chiCheŵa, chinyanja',
  },
  {code: 'zh', name: 'Chinese', nativeName: '中文 (Zhōngwén), 汉语, 漢語'},
  {code: 'cv', name: 'Chuvash', nativeName: 'чӑваш чӗлхи'},
  {code: 'kw', name: 'Cornish', nativeName: 'Kernewek'},
  {code: 'co', name: 'Corsican', nativeName: 'corsu, lingua corsa'},
  {code: 'cr', name: 'Cree', nativeName: 'ᓀᐦᐃᔭᐍᐏᐣ'},
  {code: 'hr', name: 'Croatian', nativeName: 'hrvatski'},
  {code: 'cs', name: 'Czech', nativeName: 'česky, čeština'},
  {code: 'da', name: 'Danish', nativeName: 'dansk'},
  {code: 'dv', name: 'Divehi; Dhivehi; Maldivian;', nativeName: 'ދިވެހި'},
  {code: 'nl', name: 'Dutch', nativeName: 'Nederlands, Vlaams'},
  {code: 'en', name: 'English', nativeName: 'English'},
  {code: 'eo', name: 'Esperanto', nativeName: 'Esperanto'},
  {code: 'et', name: 'Estonian', nativeName: 'eesti, eesti keel'},
  {code: 'ee', name: 'Ewe', nativeName: 'Eʋegbe'},
  {code: 'fo', name: 'Faroese', nativeName: 'føroyskt'},
  {code: 'fj', name: 'Fijian', nativeName: 'vosa Vakaviti'},
  {code: 'fi', name: 'Finnish', nativeName: 'suomi, suomen kieli'},
  {code: 'fr', name: 'French', nativeName: 'français, langue française'},
  {
    code: 'ff',
    name: 'Fula; Fulah; Pulaar; Pular',
    nativeName: 'Fulfulde, Pulaar, Pular',
  },
  {code: 'gl', name: 'Galician', nativeName: 'Galego'},
  {code: 'ka', name: 'Georgian', nativeName: 'ქართული'},
  {code: 'de', name: 'German', nativeName: 'Deutsch'},
  {code: 'el', name: 'Greek, Modern', nativeName: 'Ελληνικά'},
  {code: 'gn', name: 'Guaraní', nativeName: 'Avañeẽ'},
  {code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી'},
  {code: 'ht', name: 'Haitian; Haitian Creole', nativeName: 'Kreyòl ayisyen'},
  {code: 'ha', name: 'Hausa', nativeName: 'Hausa, هَوُسَ'},
  {code: 'he', name: 'Hebrew (modern)', nativeName: 'עברית'},
  {code: 'hz', name: 'Herero', nativeName: 'Otjiherero'},
  {code: 'hi', name: 'Hindi', nativeName: 'हिन्दी, हिंदी'},
  {code: 'ho', name: 'Hiri Motu', nativeName: 'Hiri Motu'},
  {code: 'hu', name: 'Hungarian', nativeName: 'Magyar'},
  {code: 'ia', name: 'Interlingua', nativeName: 'Interlingua'},
  {code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia'},
  {
    code: 'ie',
    name: 'Interlingue',
    nativeName: 'Originally called Occidental; then Interlingue after WWII',
  },
  {code: 'ga', name: 'Irish', nativeName: 'Gaeilge'},
  {code: 'ig', name: 'Igbo', nativeName: 'Asụsụ Igbo'},
  {code: 'ik', name: 'Inupiaq', nativeName: 'Iñupiaq, Iñupiatun'},
  {code: 'io', name: 'Ido', nativeName: 'Ido'},
  {code: 'is', name: 'Icelandic', nativeName: 'Íslenska'},
  {code: 'it', name: 'Italian', nativeName: 'Italiano'},
  {code: 'iu', name: 'Inuktitut', nativeName: 'ᐃᓄᒃᑎᑐᑦ'},
  {code: 'ja', name: 'Japanese', nativeName: '日本語 (にほんご／にっぽんご)'},
  {code: 'jv', name: 'Javanese', nativeName: 'basa Jawa'},
  {
    code: 'kl',
    name: 'Kalaallisut, Greenlandic',
    nativeName: 'kalaallisut, kalaallit oqaasii',
  },
  {code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ'},
  {code: 'kr', name: 'Kanuri', nativeName: 'Kanuri'},
  {code: 'ks', name: 'Kashmiri', nativeName: 'कश्मीरी, كشميري‎'},
  {code: 'kk', name: 'Kazakh', nativeName: 'Қазақ тілі'},
  {code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ'},
  {code: 'ki', name: 'Kikuyu, Gikuyu', nativeName: 'Gĩkũyũ'},
  {code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda'},
  {code: 'ky', name: 'Kirghiz, Kyrgyz', nativeName: 'кыргыз тили'},
  {code: 'kv', name: 'Komi', nativeName: 'коми кыв'},
  {code: 'kg', name: 'Kongo', nativeName: 'KiKongo'},
  {code: 'ko', name: 'Korean', nativeName: '한국어 (韓國語), 조선말 (朝鮮語)'},
  {code: 'ku', name: 'Kurdish', nativeName: 'Kurdî, كوردی‎'},
  {code: 'kj', name: 'Kwanyama, Kuanyama', nativeName: 'Kuanyama'},
  {code: 'la', name: 'Latin', nativeName: 'latine, lingua latina'},
  {
    code: 'lb',
    name: 'Luxembourgish, Letzeburgesch',
    nativeName: 'Lëtzebuergesch',
  },
  {code: 'lg', name: 'Luganda', nativeName: 'Luganda'},
  {
    code: 'li',
    name: 'Limburgish, Limburgan, Limburger',
    nativeName: 'Limburgs',
  },
  {code: 'ln', name: 'Lingala', nativeName: 'Lingála'},
  {code: 'lo', name: 'Lao', nativeName: 'ພາສາລາວ'},
  {code: 'lt', name: 'Lithuanian', nativeName: 'lietuvių kalba'},
  {code: 'lu', name: 'Luba-Katanga', nativeName: ''},
  {code: 'lv', name: 'Latvian', nativeName: 'latviešu valoda'},
  {code: 'gv', name: 'Manx', nativeName: 'Gaelg, Gailck'},
  {code: 'mk', name: 'Macedonian', nativeName: 'македонски јазик'},
  {code: 'mg', name: 'Malagasy', nativeName: 'Malagasy fiteny'},
  {code: 'ms', name: 'Malay', nativeName: 'bahasa Melayu, بهاس ملايو‎'},
  {code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം'},
  {code: 'mt', name: 'Maltese', nativeName: 'Malti'},
  {code: 'mi', name: 'Māori', nativeName: 'te reo Māori'},
  {code: 'mr', name: 'Marathi (Marāṭhī)', nativeName: 'मराठी'},
  {code: 'mh', name: 'Marshallese', nativeName: 'Kajin M̧ajeļ'},
  {code: 'mn', name: 'Mongolian', nativeName: 'монгол'},
  {code: 'na', name: 'Nauru', nativeName: 'Ekakairũ Naoero'},
  {code: 'nv', name: 'Navajo, Navaho', nativeName: 'Diné bizaad, Dinékʼehǰí'},
  {code: 'nb', name: 'Norwegian Bokmål', nativeName: 'Norsk bokmål'},
  {code: 'nd', name: 'North Ndebele', nativeName: 'isiNdebele'},
  {code: 'ne', name: 'Nepali', nativeName: 'नेपाली'},
  {code: 'ng', name: 'Ndonga', nativeName: 'Owambo'},
  {code: 'nn', name: 'Norwegian Nynorsk', nativeName: 'Norsk nynorsk'},
  {code: 'no', name: 'Norwegian', nativeName: 'Norsk'},
  {code: 'ii', name: 'Nuosu', nativeName: 'ꆈꌠ꒿ Nuosuhxop'},
  {code: 'nr', name: 'South Ndebele', nativeName: 'isiNdebele'},
  {code: 'oc', name: 'Occitan', nativeName: 'Occitan'},
  {code: 'oj', name: 'Ojibwe, Ojibwa', nativeName: 'ᐊᓂᔑᓈᐯᒧᐎᓐ'},
  {
    code: 'cu',
    name: 'Old Church Slavonic, Church Slavic, Church Slavonic, Old Bulgarian, Old Slavonic',
    nativeName: 'ѩзыкъ словѣньскъ',
  },
  {code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo'},
  {code: 'or', name: 'Oriya', nativeName: 'ଓଡ଼ିଆ'},
  {code: 'os', name: 'Ossetian, Ossetic', nativeName: 'ирон æвзаг'},
  {code: 'pa', name: 'Panjabi, Punjabi', nativeName: 'ਪੰਜਾਬੀ, پنجابی‎'},
  {code: 'pi', name: 'Pāli', nativeName: 'पाऴि'},
  {code: 'fa', name: 'Persian', nativeName: 'فارسی'},
  {code: 'pl', name: 'Polish', nativeName: 'polski'},
  {code: 'ps', name: 'Pashto, Pushto', nativeName: 'پښتو'},
  {code: 'pt', name: 'Portuguese', nativeName: 'Português'},
  {code: 'qu', name: 'Quechua', nativeName: 'Runa Simi, Kichwa'},
  {code: 'rm', name: 'Romansh', nativeName: 'rumantsch grischun'},
  {code: 'rn', name: 'Kirundi', nativeName: 'kiRundi'},
  {code: 'ro', name: 'Romanian, Moldavian, Moldovan', nativeName: 'română'},
  {code: 'ru', name: 'Russian', nativeName: 'русский язык'},
  {code: 'sa', name: 'Sanskrit (Saṁskṛta)', nativeName: 'संस्कृतम्'},
  {code: 'sc', name: 'Sardinian', nativeName: 'sardu'},
  {code: 'sd', name: 'Sindhi', nativeName: 'सिन्धी, سنڌي، سندھی‎'},
  {code: 'se', name: 'Northern Sami', nativeName: 'Davvisámegiella'},
  {code: 'sm', name: 'Samoan', nativeName: 'gagana faa Samoa'},
  {code: 'sg', name: 'Sango', nativeName: 'yângâ tî sängö'},
  {code: 'sr', name: 'Serbian', nativeName: 'српски језик'},
  {code: 'gd', name: 'Scottish Gaelic; Gaelic', nativeName: 'Gàidhlig'},
  {code: 'sn', name: 'Shona', nativeName: 'chiShona'},
  {code: 'si', name: 'Sinhala, Sinhalese', nativeName: 'සිංහල'},
  {code: 'sk', name: 'Slovak', nativeName: 'slovenčina'},
  {code: 'sl', name: 'Slovene', nativeName: 'slovenščina'},
  {code: 'so', name: 'Somali', nativeName: 'Soomaaliga, af Soomaali'},
  {code: 'st', name: 'Southern Sotho', nativeName: 'Sesotho'},
  {code: 'es', name: 'Spanish; Castilian', nativeName: 'español, castellano'},
  {code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda'},
  {code: 'sw', name: 'Swahili', nativeName: 'Kiswahili'},
  {code: 'ss', name: 'Swati', nativeName: 'SiSwati'},
  {code: 'sv', name: 'Swedish', nativeName: 'svenska'},
  {code: 'ta', name: 'Tamil', nativeName: 'தமிழ்'},
  {code: 'te', name: 'Telugu', nativeName: 'తెలుగు'},
  {code: 'tg', name: 'Tajik', nativeName: 'тоҷикӣ, toğikī, تاجیکی‎'},
  {code: 'th', name: 'Thai', nativeName: 'ไทย'},
  {code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ'},
  {
    code: 'bo',
    name: 'Tibetan Standard, Tibetan, Central',
    nativeName: 'བོད་ཡིག',
  },
  {code: 'tk', name: 'Turkmen', nativeName: 'Türkmen, Түркмен'},
  {code: 'tl', name: 'Tagalog', nativeName: 'Wikang Tagalog, ᜏᜒᜃᜅ᜔ ᜆᜄᜎᜓᜄ᜔'},
  {code: 'tn', name: 'Tswana', nativeName: 'Setswana'},
  {code: 'to', name: 'Tonga (Tonga Islands)', nativeName: 'faka Tonga'},
  {code: 'tr', name: 'Turkish', nativeName: 'Türkçe'},
  {code: 'ts', name: 'Tsonga', nativeName: 'Xitsonga'},
  {code: 'tt', name: 'Tatar', nativeName: 'татарча, tatarça, تاتارچا‎'},
  {code: 'tw', name: 'Twi', nativeName: 'Twi'},
  {code: 'ty', name: 'Tahitian', nativeName: 'Reo Tahiti'},
  {code: 'ug', name: 'Uighur, Uyghur', nativeName: 'Uyƣurqə, ئۇيغۇرچە‎'},
  {code: 'uk', name: 'Ukrainian', nativeName: 'українська'},
  {code: 'ur', name: 'Urdu', nativeName: 'اردو'},
  {code: 'uz', name: 'Uzbek', nativeName: 'zbek, Ўзбек, أۇزبېك‎'},
  {code: 've', name: 'Venda', nativeName: 'Tshivenḓa'},
  {code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt'},
  {code: 'vo', name: 'Volapük', nativeName: 'Volapük'},
  {code: 'wa', name: 'Walloon', nativeName: 'Walon'},
  {code: 'cy', name: 'Welsh', nativeName: 'Cymraeg'},
  {code: 'wo', name: 'Wolof', nativeName: 'Wollof'},
  {code: 'fy', name: 'Western Frisian', nativeName: 'Frysk'},
  {code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa'},
  {code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש'},
  {code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá'},
  {code: 'za', name: 'Zhuang, Chuang', nativeName: 'Saɯ cueŋƅ, Saw cuengh'},
];

const message = [
  'Who the fuck are you anyway, ${random}, why are you stirring up so much trouble, and, who pays you?',
  'Fuck you, asshole.',
  '${username}, back the fuck off.',
  'Eat a bag of fucking dicks.',
  "Fucking ${username} is a fucking pussy. I'm going to fucking bury that guy, I have done it before, and I will do it again. I'm going to fucking kill ${random}.",
  'Happy Fucking Birthday, ${username}.',
  "Why? Because fuck you, that's why.",
  '${username}, your head is as empty as a eunuch’s underpants. Fuck off!',
  'Bravo mike, ${username}.',
  'Please choke on a bucket of cocks.',
  "Christ on a bendy-bus, ${username}, don't be such a fucking faff-arse.",
  'Fuckity bye!',
  'Can you use ${tool}? Fuck no!',
  'Fuck me gently with a chainsaw, ${username}. Do I look like Mother Teresa?',
  'Fuck off ${username}, you worthless cocksplat',
  'Cool story, bro.',
  'How about a nice cup of shut the fuck up?',
  '${username}: A fucking problem solving super-hero.',
  "${username} you are being the usual slimy hypocritical asshole... You may have had value ten years ago, but people will see that you don't anymore.",
  "I'd love to stop and chat to you but I'd rather have type 2 diabetes.",
  '${username}, go and take a flying fuck at a rolling donut.',
  // "${req.params.do} the fucking ${req.params.something}!",
  'Equity only? Long hours? Zero Pay? Well ${username}, just sign me right the fuck up.',
  "I can't fuckin' even.",
  'Everyone can go and fuck off.',
  'Fuck everything.',
  'Fuck you, your whole family, your pets, and your feces.',
  'Fascinating story, in what chapter do you shut the fuck up?',
  "Go fuck yourself ${username}, you'll disappoint fewer people.",
  "And ${username} said unto ${random}, 'Verily, cast thine eyes upon the field in which I grow my fucks', and ${random} gave witness unto the field, and saw that it was barren.",
  "I don't give a flying fuck.",
  'Fuck That, Fuck You',
  'Fuck that shit, ${username}.',
  'Fuck you, you fucking fuck.',
  'Golf foxtrot yankee, ${username}.',
  'I give zero fucks.',
  'The point is, ladies and gentleman, that ${tool} -- for lack of a better word -- is good. ${tool} is right. ${tool} works. ${tool} clarifies, cuts through, and captures the essence of the evolutionary spirit. ${tool}, in all of its forms -- ${tool} for life, for money, for love, knowledge -- has marked the upward surge of mankind.',
  "I don't want to talk to you, no more, you empty-headed animal, food trough wiper. I fart in your general direction. Your mother was a hamster and your father smelt of elderberries. Now go away or I shall taunt you a second time.",
  'Fuck you and the horse you rode in on.',
  'That sounds like a fucking great idea!',
  'You can not imagine the immensity of the FUCK I do not give.',
  'Fucking fuck off, ${username}.',
  'Fuck you, fuck me, fuck your family. Fuck your father, fuck your mother, fuck you and me.',
  '${username}: Fuck off. And when you get there, fuck off from there too. Then fuck off some more. Keep fucking off until you get back here. Then fuck off again.',
  'Keep the fuck calm and ${reaction}!',
  'Oh fuck off, just really fuck off you total dickface. Christ, ${username}, you are fucking thick.',
  "${username}, you're a fucking legend.",
  'Fuck my life.',
  "${username}, there aren't enough swear-words in the English language, so now I'll have to call you perkeleen vittupää just to express my disgust and frustration with this crap.",
  'Check your fucking logs!',
  '${username}, do I look like I give a fuck?',
  'Looking for a fuck to give.',
  "What you've just said is one of the most insanely idiotic things I have ever heard, ${username}. At no point in your rambling, incoherent response were you even close to anything that could be considered a rational thought. Everyone in this room is now dumber for having listened to it. I award you no points ${username}, and may God have mercy on your soul.",
  'Maybe. Maybe not. Maybe fuck yourself.',
  'Fuck me.',
  "Happy fuckin' mornin'!",
  'No fucks given.',
  "Well ${username}, aren't you a shining example of a rancid fuck-nugget.",
  'Fuck off, ${username}.',
  // "Fuck off with ${req.params.behavior}",
  "${username}, why don't you go outside and play hide-and-go-fuck-yourself?",
  'Fuck this ${tool} in particular.',
  'Well, fuck me pink.',
  'What the fuck is your problem ${username}?',
  "Fuck you, I'm a programmer, bitch!",
  '${language}, motherfucker, do you speak it?',
  'To fuck off, or to fuck off (that is not a question)',
  "I don't give a rat's arse.",
  'You Fucktard!',
  "That's fucking ridiculous",
  "${username}, you're a fucking Rock Star!",
  'Read the fucking manual!',
  "For Fuck's sake!",
  '${username}, Thou clay-brained guts, thou knotty-pated fool, thou whoreson obscene greasy tallow-catch!',
  'Fuck this shit!',
  '${username}, shut the fuck up.',
  'Not a single fuck was given.',
  'Fuck you very much.',
  'Fuck that.',
  '${username}, you think I give a fuck?',
  '${username}, what the fuck were you actually thinking?',
  'Fuck this.',
  "Who has two thumbs and doesn't give a fuck? ${botname}.",
  'Thanks, fuck you too.',
  'Come the fuck in or fuck the fuck off.',
  "I don't waste my fucking time with your bullshit ${username}!",
  'What the fuck‽',
  'Merry Fucking Christmas, ${username}.',
  'Fuck off, you must, ${username}.',
  'Fuck you, ${username}.',
  'Ask me if I give a motherfuck ?!!',
  "Zero, that's the number of fucks I give.",
];

function selectRandom<T>(array: T[]): T {
  const index = Math.floor(Math.random() * array.length);
  return array[index];
}

function format(text: string): string {
  let entryText = '';
  // we might hit cases where we repeteadly expand text, sub-text contain expanders, too
  // basically tail recursion
  while (entryText !== text) {
    entryText = text;
    if (text.includes('${tool}')) {
      text = text.replace('${tool}', selectRandom(tools));
      continue;
    }

    if (text.includes('${reaction}')) {
      text = text.replace('$reaction', selectRandom(reaction));
      continue;
    }

    if (text.includes('${language}')) {
      const language = selectRandom(languages);
      text = text.replace(
        '${language}',
        Math.random() > 0.5 ? language.name : language.nativeName
      );
      continue;
    }
  }
  return text;
}

function setNames(
  text: string,
  username: string,
  random: string,
  botname: string
) {
  return text
    .split('${username}')
    .join(username)
    .split('${random}')
    .join(random)
    .split('${botname}')
    .join(botname);
}

function response(): string {
  const text = selectRandom(message);
  return format(text);
}

let lastInvoke = new Date(1900, 1);
let botname = '';

async function bark(interaction: ChatInputCommandInteraction) {
  const time = (new Date().getTime() - lastInvoke.getTime()) / 1000;
  if (time < 60) {
    return;
  }

  const username = interaction.member?.user.username?.toString() ?? '';
  const random = interaction.guild?.members.cache.random()?.toString() ?? '';
  await interaction.reply(setNames(response(), username, random, botname));
  lastInvoke = new Date();
}

const plugin: InteractionPlugin = {
  descriptor: {
    name: 'bark',
    description: 'Randomized rudeness from a robot.',
  },
  onInit: async (client,) => {
    botname = client.user?.toString() || '';
  },
  onNewInteraction: bark,
};

export default plugin;
