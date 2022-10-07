import { APIApplicationCommandAutocompleteInteraction, APIApplicationCommandInteraction, APIMessageComponentInteraction, APIModalSubmitInteraction, APIPingInteraction, GatewayGuildMemberUpdateDispatchData, GatewayIntentBits, GatewayInteractionCreateDispatchData, GatewayMessageCreateDispatchData, GatewayMessageDeleteBulkDispatchData, GatewayMessageDeleteDispatchData, GatewayMessageReactionAddDispatchData, GatewayMessageReactionRemoveDispatchData, GatewayMessageReactionRemoveEmojiDispatchData, GatewayMessageUpdateDispatchData, GatewayPresenceUpdateData, GatewayReadyDispatchData, GatewayThreadMembersUpdate, GatewayThreadMemberUpdateDispatchData, GatewayUserUpdateDispatchData } from "discord-api-types/v10";
import { GatewayMessageReactionRemoveAllDispatchData } from "./strategies/dispatch-strategies";
import { AutocompleteInteraction, CommandInteraction, createInteractionBus, ButtonInteraction, ModalInteraction, PingInteraction } from "./strategies/interaction-strategies";
import { createGatewayClient } from "./clients/gateway-client";
import { createGatewayHandler } from "./strategies/gateway-strategies";
import { createClient, createRestClient } from "./clients";

/**
 * Full qualified interaction object that consumers receive
 */
export type Interaction = CommandInteraction | AutocompleteInteraction | ButtonInteraction | ModalInteraction | PingInteraction;

/**
 * Data constructs containted in the interactions
 */
export type InteractionData = CommandInteractionData | AutocompleteInteractionData | ButtonInteractionData | ModalInteractionData | PingInteractionData;
export type CommandInteractionData = APIApplicationCommandInteraction;
export type AutocompleteInteractionData = APIApplicationCommandAutocompleteInteraction;
export type ButtonInteractionData = APIMessageComponentInteraction;
export type ModalInteractionData = APIModalSubmitInteraction;
export type PingInteractionData = APIPingInteraction;

// Gateway Messages Data
export type GatewayReady = GatewayReadyDispatchData;
export type InteractionCreate = GatewayInteractionCreateDispatchData;
export type UserUpdate = GatewayUserUpdateDispatchData;
export type GuildMemberUpdate = GatewayGuildMemberUpdateDispatchData;
export type ThreadMemberUpdate = GatewayThreadMemberUpdateDispatchData;
export type ThreadMembersUpdate = GatewayThreadMembersUpdate;
export type MessageCreate = GatewayMessageCreateDispatchData;
export type MessageUpdate = GatewayMessageUpdateDispatchData;
export type MessageDelete = GatewayMessageDeleteDispatchData;
export type MessageDeleteBulk = GatewayMessageDeleteBulkDispatchData;
export type MessageReactionAdd = GatewayMessageReactionAddDispatchData;
export type MessageReactionRemove = GatewayMessageReactionRemoveDispatchData;
export type MessageReactionRemoveEmoji = GatewayMessageReactionRemoveEmojiDispatchData;
export type MessageReactionRemoveAll = GatewayMessageReactionRemoveAllDispatchData;

// the event busses
export type GatewayHandler = ReturnType<typeof createGatewayHandler>;
export type GatewayClient = ReturnType<typeof createGatewayClient>;
export type InteractionBus = ReturnType<typeof createInteractionBus>;
export type RestClient = ReturnType<typeof createClient>[1]['restClient'];
export type DiscordClient = ReturnType<typeof createClient>[1];

//gateway event messages
export type Presence = GatewayPresenceUpdateData;