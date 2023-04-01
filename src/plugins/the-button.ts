import { ButtonPlugin } from "../message/hooks";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, Client } from "discord.js";
import { waitFor } from "./utils/wait-until";
import { Logger } from "winston";
import { Kysely } from "kysely";

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


interface ButtonTableType {
    message: string,
    channel: string,
    startTime: Date,
    endTime: Date,
    claimTime?: string | Date,
    claimedBy?: string | Date
}

interface Database {
    [ButtonTable]: ButtonTableType
}


const bootstrapDatabase = async (db: Kysely<any>): Promise<Kysely<Database>> => {
    await db.schema
        .createTable(ButtonTable).ifNotExists()
        .addColumn("message", "text", x => x.notNull().primaryKey())
        .addColumn("channel", "text", x => x.notNull())
        .addColumn("startTime", "text", x => x.notNull())
        .addColumn("endTime", "text", x => x.notNull())
        .addColumn("claimTime", "text")
        .addColumn("claimedBy", "text")
        .execute();
    return <Kysely<Database>> db;
}

const random = <T>(stuff: T[]): T =>
    stuff[Math.floor(Math.random() * stuff.length)];


const postButton = async (channelId: string, client: Client, db: Kysely<Database>, buttonProposal: ButtonEvent) => {
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

const createButton = async (channelId: string, client: Client, db: Kysely<Database>, buttonProposal: ButtonEvent) => {
    const message = await postButton(channelId, client, db, buttonProposal);
    if (!message) {
        return;
    }

    await db
        .insertInto(ButtonTable)
        .values({
            message: message.id,
            channel: channelId,
            startTime: new Date(),
            endTime: new Date((new Date().getTime() + (buttonProposal.maxDurationInSeconds * 1_000)))
        })
        .execute();
    return message;
}

const claimButton = async (interaction: ButtonInteraction, db: Kysely<Database>, logger: Logger) => {
    interaction.update({});
    const userId = interaction.user.id;
    const messageId = interaction.message.id;
    logger.info(`A button got claimed by ${interaction.user.username}`)

    await db
        .updateTable(ButtonTable)
        .set({
            claimTime: new Date(),
            claimedBy: userId
        })
        .where("message", "=", messageId)
        .execute();

    await interaction.message.delete();
}

const revokeButton = async (messageId: string, db: Kysely<Database>, client: Client) => {
    const result = (await db
        .selectFrom(ButtonTable)
        .select(["claimTime", "channel", "message"])
        .where("message", "=", messageId)
        .executeTakeFirstOrThrow()
    );

    if (result.claimTime) {
        return;
    }

    await db
        .updateTable(ButtonTable)
        .set({
            claimTime: '[never claimed]',
            claimedBy: '[nobody]'
        })
        .where("message", "=", messageId)
        .execute();

    const channel = (await client.channels.fetch(result.channel));
    if (!channel || !channel.isTextBased()) {
        return;
    }

    const message = await channel.messages.fetch(result.message);
    if (message) {
        await message.delete();
    }
}


const buttonLogic = async (targetChannel: string, client: Client, db: Kysely<Database>, buttonProposals: ButtonEvent[]) => {
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

