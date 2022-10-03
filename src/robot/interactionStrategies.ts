import { APIApplicationCommandAutocompleteInteraction, APIApplicationCommandInteraction, APIInteractionResponseCallbackData, APIMessageComponentInteraction, APIModalSubmission, APIModalSubmitInteraction, APIPingInteraction, GatewayInteractionCreateDispatchData, InteractionType, MessageFlags } from "discord-api-types/v10";
import logger from "../logging";
import { createInteractionDefer, createInteractionResponse } from "./api-client";
import { TypedEvent } from "./eventEmitter";


export type CommandInteraction = {
    type: InteractionType.ApplicationCommand;
    data: APIApplicationCommandInteraction;
    reply: ReturnType<typeof createInteractionResponse>;
    defer: ReturnType<typeof createInteractionDefer>;
    // followup: () => Promise<void>;
    // delete: () => Promise<void>;


    // functions
}

export type AutocompleteInteraction = {
    type: InteractionType.ApplicationCommandAutocomplete;
    data: APIApplicationCommandAutocompleteInteraction;
    // functions
}

export type MessageComponentInteraction = {
    type: InteractionType.MessageComponent;
    data: APIMessageComponentInteraction;
    // functions
}

export type ModalSubmitInteraction = {
    type: InteractionType.ModalSubmit;
    data: APIModalSubmitInteraction;
    // functions
}

export type PingInteraction = {
    type: InteractionType.Ping;
    data: APIPingInteraction;
    // functions
}

export type Interaction = CommandInteraction | AutocompleteInteraction | MessageComponentInteraction | ModalSubmitInteraction | PingInteraction;



export const createInteractionBus = () => ({
    onCommand: new TypedEvent<CommandInteraction>(),
    onAutocomplete: new TypedEvent<AutocompleteInteraction>(),
    onMessageComponent: new TypedEvent<MessageComponentInteraction>(),
    onModalSubmit: new TypedEvent<ModalSubmitInteraction>(),
    onPing: new TypedEvent<PingInteraction>()
});

export const handleInteraction = (interaction: GatewayInteractionCreateDispatchData, interactionBus: InteractionBus) => {
    switch(interaction.type) {
        case InteractionType.ApplicationCommand:
            interactionBus.onCommand.emit({
                type: interaction.type,
                data: interaction,
                defer: createInteractionDefer(interaction),
                reply: createInteractionResponse(interaction),
            });
            break;
        case InteractionType.ApplicationCommandAutocomplete:
            interactionBus.onAutocomplete.emit({
                type: interaction.type,
                data: interaction
            });
            break;
        case InteractionType.MessageComponent:
            interactionBus.onMessageComponent.emit({
                type: interaction.type,
                data: interaction
            });
            break;
        case InteractionType.ModalSubmit:
            interactionBus.onModalSubmit.emit({
                type: interaction.type,
                data: interaction
            });
            break;
        case InteractionType.Ping:
            interactionBus.onPing.emit({
                type: interaction.type,
                data: interaction
            });
            break;
        default:
            logger.warn(`Unhandled interaction type in interaction handler: ${JSON.stringify(interaction)}`);
            break;
    }
}

export type InteractionBus = ReturnType<typeof createInteractionBus>;