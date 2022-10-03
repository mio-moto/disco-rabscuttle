import { GatewayDispatchPayload, GatewayDispatchEvents, GatewayReadyDispatchData,
    GatewayInteractionCreateDispatchData, GatewayUserUpdateDispatchData, GatewayGuildMemberUpdateDispatchData,
    GatewayThreadMemberUpdateDispatchData, GatewayThreadMembersUpdate, GatewayMessageUpdateDispatchData,
    GatewayMessageDeleteDispatchData, GatewayMessageDeleteBulkDispatchData, GatewayMessageReactionAddDispatchData,
    GatewayMessageReactionRemoveDispatchData, GatewayMessageReactionRemoveEmojiDispatchData,
    GatewayMessageCreateDispatchData,
    Snowflake } from "discord-api-types/v10";
import logger from "../logging";
import { TypedEvent } from "./eventEmitter";
import { GatewayClient } from "./sendCommands";

export const handleDispatch = (eventBus: GatewayEventBus, message: GatewayDispatchPayload) => {
    switch (message.t) {
        case GatewayDispatchEvents.Ready:
            eventBus.onReady.emit(message.d);
            break;
        case GatewayDispatchEvents.InteractionCreate:
            eventBus.onInteractionCreate.emit(message.d);
            break;
        case GatewayDispatchEvents.UserUpdate:
            eventBus.onUserUpdate.emit(message.d);
            break;
        case GatewayDispatchEvents.GuildMemberUpdate:
            eventBus.onGuildMemberUpdate.emit(message.d);
            break;
        case GatewayDispatchEvents.ThreadMemberUpdate:
            eventBus.onThreadMemberUpdate.emit(message.d);
            break;
        case GatewayDispatchEvents.ThreadMembersUpdate:
            eventBus.onThreadMembersUpdate.emit(message.d);
            break;
        case GatewayDispatchEvents.MessageCreate:
            eventBus.onMessageCreate.emit(message.d);
            break;
        case GatewayDispatchEvents.MessageUpdate:
            eventBus.onMessageUpdate.emit(message.d);
            break;
        case GatewayDispatchEvents.MessageDelete:
            eventBus.onMessageDelete.emit(message.d);
            break;
        case GatewayDispatchEvents.MessageDeleteBulk:
            eventBus.onMessageDeleteBulk.emit(message.d);
            break;
        case GatewayDispatchEvents.MessageReactionAdd:
            eventBus.onMessageReactionAdd.emit(message.d);
            break;
        case GatewayDispatchEvents.MessageReactionRemove:
            eventBus.onMessageReactionRemove.emit(message.d);
            break;
        case GatewayDispatchEvents.MessageReactionRemoveAll:
            // eventBus.onAnything.emit(message.d);
            eventBus.onMessageReactionRemoveAll.emit(message.d);
            break;
        case GatewayDispatchEvents.MessageReactionRemoveEmoji:
            eventBus.onMessageReactionRemoveEmoji.emit(message.d);
            break;

        default:
            logger.debug(`Unhandled event type: ${message.t}  (${JSON.stringify(message.d)})`)

    }

    logger.debug(`>>> ${message.op} - ${message.s} - ${message.t}`);
}

// the compiler breaks when this message is declared as interface, idk why, but here's a copy-paste
type MessageReactionRemoveData = {
    /**
     * The id of the channel
     */
    channel_id: Snowflake;
    /**
     * The id of the message
     */
    message_id: Snowflake;
    /**
     * The id of the guild
     */
    guild_id?: Snowflake;
}
export type GatewayMessageReactionRemoveAllDispatchData = MessageReactionRemoveData;

export const createDispatchEventBus = () => ({
    onReady: new TypedEvent<GatewayReadyDispatchData>(),
    onInteractionCreate: new TypedEvent<GatewayInteractionCreateDispatchData>(),
    onUserUpdate: new TypedEvent<GatewayUserUpdateDispatchData>(),
    onGuildMemberUpdate: new TypedEvent<GatewayGuildMemberUpdateDispatchData>(),
    onThreadMemberUpdate: new TypedEvent<GatewayThreadMemberUpdateDispatchData>(),
    onThreadMembersUpdate: new TypedEvent<GatewayThreadMembersUpdate>(),
    onMessageCreate: new TypedEvent<GatewayMessageCreateDispatchData>(),
    onMessageUpdate: new TypedEvent<GatewayMessageUpdateDispatchData>(),
    onMessageDelete: new TypedEvent<GatewayMessageDeleteDispatchData>(),
    onMessageDeleteBulk: new TypedEvent<GatewayMessageDeleteBulkDispatchData>(),
    onMessageReactionAdd: new TypedEvent<GatewayMessageReactionAddDispatchData>(),
    onMessageReactionRemove: new TypedEvent<GatewayMessageReactionRemoveDispatchData>(),
    // onMRRA: new TypedEvent<sadlkjglk>(),
    onMessageReactionRemoveEmoji: new TypedEvent<GatewayMessageReactionRemoveEmojiDispatchData>(),
    onMessageReactionRemoveAll: new TypedEvent<GatewayMessageReactionRemoveAllDispatchData>()

});

export type GatewayEventBus = ReturnType<typeof createDispatchEventBus>;