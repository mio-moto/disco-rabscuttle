import { ActionRowBuilder } from '@discordjs/builders'
import {
  ActionRow,
  ButtonBuilder,
  ButtonComponent,
  type ButtonInteraction,
  ButtonStyle,
  type ChatInputCommandInteraction,
  Client,
  Component,
  type Message,
} from 'discord.js'
import type { ButtonPlugin, InteractionPlugin } from '../message/hooks'
import { waitFor } from './utils/wait-until'

const CardBack = '🎴'
const CardLoss = '🃏'
const CardWin = '👑'
type CardOption = typeof CardBack | typeof CardLoss | typeof CardWin
type Deck = [CardOption, CardOption, CardOption]
type Choice = 0 | 1 | 2

const random = <T>(stuff: T[]): T => stuff[Math.floor(Math.random() * stuff.length)]

const buttonBuilder = (id: string, emoji: string, style: Exclude<ButtonStyle, ButtonStyle.Link>, selectable: boolean) =>
  new ButtonBuilder({
    customId: id,
    emoji: emoji,
    style: style,
    disabled: !selectable,
  })

const buildButtonRow = (deck: Deck, selection: -1 | Choice, selectable: boolean) =>
  new ActionRowBuilder<ButtonBuilder>().addComponents([
    buttonBuilder('monte-0', deck[0], selection === 0 ? ButtonStyle.Primary : ButtonStyle.Secondary, selectable),
    buttonBuilder('monte-1', deck[1], selection === 1 ? ButtonStyle.Primary : ButtonStyle.Secondary, selectable),
    buttonBuilder('monte-2', deck[2], selection === 2 ? ButtonStyle.Primary : ButtonStyle.Secondary, selectable),
  ])

const buildHiddenMonteRow = () => buildButtonRow([CardBack, CardBack, CardBack], -1, true)

const revealCard = (choice: 0 | 1 | 2, resolution: CardOption, deck: Deck) => {
  const localDeck = [...deck]
  localDeck[choice] = resolution
  return localDeck
}

interface GameState {
  user: string
  revealedCards: [boolean, boolean, boolean]
}

const messageContext: { [k: string]: GameState } = {}

const startMonte = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply({
    ephemeral: false,
    content: 'Three-Card Monte',
    components: [buildHiddenMonteRow()],
  })

  const message = await interaction.fetchReply()
  messageContext[message.id] = {
    user: interaction.user.id,
    revealedCards: [false, false, false],
  }

  await waitFor(60 * 1_000)

  // responding to monte will delete from the message context anyway
  // if it still exists, it hasn't been answered
  if (message.id in messageContext) {
    await message.delete()
  }
}

enum RevealType {
  CardReveal = 0,
  Message = 1,
  Pause = 2,
  Custom = 3,
}

type Duration = { duration: number }

type RevealStepCard = Duration & {
  type: RevealType.CardReveal
  clickedCard: boolean
}

type RevealStepMessage = Duration & {
  type: RevealType.Message
  message: string
}

type RevealStepPause = Duration & {
  type: RevealType.Pause
  duration: number
}

type RevealStepCustom = Duration & {
  type: RevealType.Custom
  execute: (message: Message<boolean>) => Promise<unknown>
}

type RevealStep = RevealStepCard | RevealStepMessage | RevealStepPause | RevealStepCustom
type RevealStory = RevealStepMessage | RevealStepPause | RevealStepCustom
const RevealClickedCard: RevealStepCard = { type: RevealType.CardReveal, clickedCard: true, duration: 1_750 }
const RevealOtherCard: RevealStepCard = { type: RevealType.CardReveal, clickedCard: false, duration: 1_750 }
const RevealMessage = (message: string, duration = 750): RevealStepMessage => ({ type: RevealType.Message, message: message, duration: duration })
const RevealPause = (durationInMilliseconds = 750): RevealStepPause => ({ type: RevealType.Pause, duration: durationInMilliseconds })
const RevealAction = (action: (message: Message) => Promise<unknown>, duration = 750): RevealStepCustom => ({
  type: RevealType.Custom,
  execute: action,
  duration,
})

const intros: RevealStory[][] = [
  [RevealMessage('What do we have here...')],
  [RevealMessage('Another one?!')],
  [RevealMessage('Well, well, well...')],
  [RevealMessage('My favourite - customer.'), RevealMessage('Yes, customer.')],
  [RevealMessage('Good choice, good choice.')],
  [RevealMessage("You didn't think this through, did you?")],
  [RevealMessage('Alright, no tricks now.')],
  [RevealMessage("You can't trust good ol' Rabs.")],
  [RevealMessage('This time you will win for sure.')],
  [RevealMessage('Maybe not the luckiest choice.')],
  [RevealMessage("I've expected that.")],
  [RevealMessage("Couldn't have chose any better."), RevealMessage('Seriously...')],
  [RevealMessage('uwu picked a gweat choice of cawds thewe, mistew~'), RevealMessage('Ahem.')],
  [RevealMessage('This is going to be a great round of monopoly.')],
]

const revealChoreosBusting: RevealStep[][] = [
  [RevealOtherCard, RevealMessage('Good.'), RevealClickedCard, RevealMessage('Bad.'), RevealOtherCard],
  [RevealMessage("C'mon man."), RevealMessage("I'm already sorry for you."), RevealOtherCard, RevealOtherCard, RevealOtherCard],
  [{ ...RevealClickedCard, duration: 0 }, RevealMessage('Better luck next time.')],
  [RevealMessage('Oh, no.'), RevealClickedCard],
  [RevealOtherCard, RevealMessage('||Un||Lucky you!', 1_200), { ...RevealOtherCard, duration: 0 }, RevealOtherCard, RevealMessage('Unlucky you.')],
  [RevealOtherCard, RevealMessage('Right or left, right or left?'), RevealOtherCard, RevealClickedCard],
]

const revealChoreosWinning: RevealStep[][] = [
  [RevealClickedCard, RevealMessage("Very good, I'm proud of you.")],
  [RevealOtherCard, RevealOtherCard, RevealMessage('What do you guess is behind the last card?'), RevealClickedCard],
  [RevealClickedCard, RevealMessage('That was quick.')],
  [RevealOtherCard, RevealMessage("Let's see, what do we have here?"), RevealClickedCard, RevealMessage('If you just had that luck with your face.')],
  [
    RevealMessage('The FitnessGram™ Pacer Test is a multistage aerobic capacity test that progressively gets more difficult as it continues.', 2_000),
    RevealOtherCard,
    RevealMessage(
      'The 20 meter pacer test will begin in 30 seconds. Line up at the start. The running speed starts slowly, but gets faster each minute after you hear this signal.',
      2_500,
    ),
    RevealMessage('`beeep`', 1_250),
    RevealMessage('A single lap should be completed each time you hear this sound.', 1_900),
    RevealMessage('`ding`', 1_250),
    RevealMessage('Remember to run in a straight line, and run as long as possible.', 1_900),
    RevealMessage('The second time you fail to complete a lap before the sound, your test is over.', 2_250),
    RevealMessage('The test will begin on the word start.', 1_650),
    RevealMessage('On your mark, get ready, start.', 1_500),
    RevealMessage('🏃‍♂️🏃‍♀️'),
    RevealOtherCard,
    RevealClickedCard,
  ],
]

const revealChoreosRandom: RevealStep[][] = [
  [RevealMessage("No. You win. You lost. Decide for yourself, I'm not going to do it.")],
  [
    RevealAction(async (message) => {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttonBuilder('monte-1', '🍝', ButtonStyle.Secondary, false))
      await message.edit({ content: 'Oops.', components: [row] })
    }),
  ],
  [RevealMessage('Uh, hum.'), RevealOtherCard, RevealOtherCard, RevealOtherCard],
  [
    RevealMessage('Good'),
    RevealOtherCard,
    RevealMessage('Good'),
    RevealOtherCard,
    RevealMessage('Err...'),
    { ...RevealOtherCard, duration: 2_500 },
    RevealMessage('Anyway.', 2_500),
    RevealAction(async (message) => {
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(...buildButtonRow([CardLoss, CardLoss, CardLoss], -1, false).components)
        .addComponents(buttonBuilder('monte-4', '👑', ButtonStyle.Primary, false))
      await message.edit({ components: [row] })
    }),
  ],
]

const runStory = async (message: Message<boolean>, choreo: (RevealStepMessage | RevealStepPause | RevealStepCustom)[]) =>
  await revealCards(message, 0, -1, choreo)
const revealCards = async (message: Message<boolean>, selection: Choice, winningSelection: Choice | -1, choreo: RevealStep[]) => {
  let deck: Deck = [CardBack, CardBack, CardBack]

  const notChoice = (deck: Deck, choice: Choice, winningSelection: Choice | -1): Choice => {
    const availableChoices = deck.map((x, i) => (x === CardBack ? i : -1)).filter((x) => x >= 0)
    const remainingChoices = availableChoices.filter((x) => x !== choice) as Choice[]
    const prefferedSelection = remainingChoices[0] === winningSelection ? 1 : 0
    const selection = Math.min(remainingChoices.length - 1, prefferedSelection)
    return remainingChoices[selection]
  }
  const beenRevealed = (deck: Deck) => deck.map((x) => x !== CardBack)
  const revealDeckCard = (deck: Deck, choice: Choice, bust: boolean): Deck => <Deck>deck.map((x, i) => {
      if (i !== choice) {
        return x
      }
      return bust ? CardLoss : CardWin
    })

  for (let i = 0; i < choreo.length; i++) {
    const step = choreo[i]
    switch (step.type) {
      case RevealType.CardReveal: {
        const choice = step.clickedCard ? selection : notChoice(deck, selection, winningSelection)
        deck = revealDeckCard(deck, choice, choice !== winningSelection)
        message.edit({ components: [buildButtonRow(deck, selection, false)] })
        break
      }
      case RevealType.Message:
        message.edit({ content: step.message })
        break
      case RevealType.Pause:
        break
      case RevealType.Custom:
        await step.execute(message)
        break
    }
    await waitFor(step.duration)
  }

  if (winningSelection >= 0) {
    deck = <Deck>deck.map((x, i) => {
      if (x === CardBack) {
        return i === winningSelection ? CardWin : CardLoss
      }
      return x
    })
    await message.edit({ components: [buildButtonRow(deck, selection, false)] })
  }
}

const doClickChoreography = async (interaction: ButtonInteraction) => {
  if (messageContext[interaction.message.id].user !== interaction.user.id) {
    await interaction.reply({ ephemeral: true, content: "you're not allowed to do that." })
    return
  }

  const notChoice = (deck: Deck, choice: Choice): Choice => {
    const availableChoices = <Choice[]>deck
      .map((x, i) => (x === CardBack ? i : -1))
      .map((x) => (x === choice ? -1 : x))
      .filter((x) => x >= 0)
    const index = Math.min(availableChoices.length, Math.random() >= 0 ? 0 : 1)
    return availableChoices[index]
  }

  delete messageContext[interaction.message.id]
  const selection = Number.parseInt(interaction.customId.split('-')[1]) as Choice
  await interaction.update({ content: 'Three-Card Monte', components: [buildButtonRow([CardBack, CardBack, CardBack], selection, false)] })

  const deck = [CardBack, CardBack, CardBack]
  const bust = Math.random() > 1.0 / 7.5

  // first stage is thinking, before revealing cards
  await runStory(interaction.message, random(intros))
  if (Math.random() < 1.0 / 15.0) {
    await revealCards(interaction.message, selection, -1, random(revealChoreosRandom))
    return
  }

  const choreos = bust ? revealChoreosBusting : revealChoreosWinning
  const choreo = random(choreos)
  await revealCards(interaction.message, selection, bust ? notChoice([CardBack, CardBack, CardBack], selection) : selection, choreo)
}

export const ThreeCardMonte: InteractionPlugin & ButtonPlugin = {
  name: 'Three-Card Monte',
  publishedButtonIds: ['monte-0', 'monte-1', 'monte-2'],
  descriptor: {
    name: '3monte',
    description: 'Starts a Three-Card Monte game',
  },
  onNewInteraction: startMonte,
  onNewButtonClick: doClickChoreography,
}
