import { GatewayDispatchPayload, GatewayDispatchEvents, Snowflake } from "discord-api-types/v10";
import logger from "../../logging";
import { GatewayReady, InteractionCreate, UserUpdate,
    GuildMemberUpdate, ThreadMemberUpdate, ThreadMembersUpdate,
    MessageCreate, MessageUpdate, MessageDelete,
    MessageDeleteBulk, MessageReactionAdd, MessageReactionRemove,
    MessageReactionRemoveEmoji, MessageReactionRemoveAll } from "../alias";
import { TypedEvent } from "../systems/event-emitter";

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
            logger.debug(`Unhandled event type: ${message.t}`); //  (${JSON.stringify(message.d)})

    }

    // logger.debug(`>>> ${message.op} - ${message.s} - ${message.t}`);
}

// the compiler breaks when this message is declared as interface, idk why, but here's a copy-paste
export type MessageReactionRemoveData = {
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
    onReady: new TypedEvent<GatewayReady>(),
    onInteractionCreate: new TypedEvent<InteractionCreate>(),
    onUserUpdate: new TypedEvent<UserUpdate>(),
    onGuildMemberUpdate: new TypedEvent<GuildMemberUpdate>(),
    onThreadMemberUpdate: new TypedEvent<ThreadMemberUpdate>(),
    onThreadMembersUpdate: new TypedEvent<ThreadMembersUpdate>(),
    onMessageCreate: new TypedEvent<MessageCreate>(),
    onMessageUpdate: new TypedEvent<MessageUpdate>(),
    onMessageDelete: new TypedEvent<MessageDelete>(),
    onMessageDeleteBulk: new TypedEvent<MessageDeleteBulk>(),
    onMessageReactionAdd: new TypedEvent<MessageReactionAdd>(),
    onMessageReactionRemove: new TypedEvent<MessageReactionRemove>(),
    onMessageReactionRemoveEmoji: new TypedEvent<MessageReactionRemoveEmoji>(),
    onMessageReactionRemoveAll: new TypedEvent<MessageReactionRemoveAll>()
});

export type GatewayEventBus = ReturnType<typeof createDispatchEventBus>;