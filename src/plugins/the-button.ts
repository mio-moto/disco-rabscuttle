import { ButtonPlugin } from "../message/hooks";
import { PromisedDatabase } from "promised-sqlite3";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Client } from "discord.js";
import { waitFor } from "./utils/wait-until";
import { Logger } from "winston";

type ButtonEvent = {
    message?: string,
    buttonStyle: ButtonStyle
    buttonText: string,
    maxDurationInSeconds: number,
    buttonEmoji?: string
}

interface PluginConfig {
    buttonPlugin: {
        targetChannels: string[],
        proposals: ButtonEvent[]
    }
}

const ButtonTable = "the_button";

const bootstrapDatabase = async (db: PromisedDatabase) => {
    db.createTable(
        ButtonTable,
        true,
        "message TEXT NOT NULL PRIMARY KEY",
        "channel TEXT NOT NULL",
        "startTime TEXT NOT NULL",
        "endTime TEXT NOT NULL",
        "claimTime TEXT",
        "claimedBy TEXT",

    )
}

const random = <T>(stuff: T[]): T =>
    stuff[Math.floor(Math.random() * stuff.length)];


const postButton = async (channelId: string, client: Client, db: PromisedDatabase, buttonProposal: ButtonEvent) => {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) {
        return;
    }
    const button = new ButtonBuilder()
        .setStyle(buttonProposal.buttonStyle)
        .setLabel(buttonProposal.buttonText)
        .setCustomId("the-evil-button");
    if (buttonProposal.buttonEmoji) {
        button.setEmoji(buttonProposal.buttonEmoji)
    };

    return await channel.send({ content: buttonProposal.message, components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)] });
}

const createButton = async (channelId: string, client: Client, db: PromisedDatabase, buttonProposal: ButtonEvent) => {
    const message = await postButton(channelId, client, db, buttonProposal);
    if (!message) {
        return;
    }

    await db.run(`
        INSERT INTO ${ButtonTable} (message, channel, startTime, endTime)
        VALUES (?, ?, CURRENT_TIMESTAMP, DATETIME('now', '+${buttonProposal.maxDurationInSeconds} seconds'))
    `, message.id, channelId);
    return message;
}

const claimButton = async (interaction: ButtonInteraction, db: PromisedDatabase, logger: Logger) => {
    interaction.update({});
    const userId = interaction.user.id;
    const messageId = interaction.message.id;
    logger.info(`A button got claimed by ${interaction.user.username}`)

    await db.run(`
        UPDATE ${ButtonTable}
        SET claimTime = DATETIME('now'),
            claimedBy = ?
        WHERE message = ?
    `, userId, messageId);
    await interaction.message.delete();
}

const revokeButton = async (messageId: string, db: PromisedDatabase, client: Client) => {
    const result = (await db.get(`SELECT claimTime, channel, message FROM ${ButtonTable} WHERE message = ?`, messageId)) as { claimTime?: string, channel: string, message: string };
    if (result.claimTime) {
        return;
    }

    await db.run(`
        UPDATE ${ButtonTable}
        SET claimTime = ?,
            claimedBy = ?
        WHERE message = ? 
    `, '[never claimed]', '[nobody]', messageId);

    const channel = (await client.channels.fetch(result.channel));
    if (!channel || !channel.isTextBased()) {
        return;
    }

    const message = await channel.messages.fetch(result.message);
    if (message) {
        await message.delete();
    }
}


const buttonLogic = async (targetChannel: string, client: Client, db: PromisedDatabase, buttonProposals: ButtonEvent[]) => {
    const buttonProposal = random(buttonProposals);
    const maxDuration = buttonProposal.maxDurationInSeconds

    const currentTime = new Date();
    const message = await createButton(targetChannel, client, db, buttonProposal);
    if (!message) {
        return;
    }
    const passedTime = new Date();
    const passedMilliseconds = passedTime.valueOf() - currentTime.valueOf();
    const remainingDuration = (maxDuration * 1_000) - passedMilliseconds;
    if (remainingDuration > 0) {
        await waitFor(remainingDuration);
    }
    await revokeButton(message.id, db, client);
}

const DefaultInterval = 1_000 * 60 * 60 * 14;

export const TheButtonPlugin: ButtonPlugin = {
    name: "The Button",
    publishedButtonIds: ['the-evil-button'],
    onInit: async function (client, db, config, logger) {
        bootstrapDatabase(db);
        const pluginConfig = config.plugins as PluginConfig;
        const proposals = pluginConfig.buttonPlugin.proposals;

        setInterval(async () => {
            const jitter = Math.random() * DefaultInterval;
            await waitFor(jitter);
            for (const channel of pluginConfig.buttonPlugin.targetChannels) {
                // not awaiting, so it can and will run in the background
                buttonLogic(channel, client, db, proposals);
                // spacing this apart a bit, so that it doesn't hammer the API
                await waitFor(250);
            }
            await waitFor(DefaultInterval - jitter);
        }, DefaultInterval)
        this.onNewButtonClick = async (interaction) => { try { await claimButton(interaction, db, logger); } catch (e) { logger.error(JSON.stringify(e)); } };
    },
    onNewButtonClick: async (_) => {
        throw new Error();
    },
}

