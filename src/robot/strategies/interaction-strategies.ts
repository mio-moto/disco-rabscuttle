import { InteractionType } from "discord-api-types/v10";
import logger from "../../logging";
import { AutocompleteInteractionData, ButtonInteractionData, CommandInteractionData, Interaction, InteractionBus, InteractionData, ModalInteractionData, PingInteractionData } from "../alias";
import { clientFactories } from "../clients/rest-client";
import { TypedEvent } from "../systems/event-emitter";

const { commands, autocomplete } = clientFactories;

export type CommandInteraction = {
    type: InteractionType.ApplicationCommand;
    data: CommandInteractionData;
    reply: ReturnType<typeof commands.createInteractionResponse>;
    defer: ReturnType<typeof commands.deferInteractionResponse>;
    delete: ReturnType<typeof commands.deleteInteractionResponse>;
    edit: ReturnType<typeof commands.editInteractionResponse>;
    followup: ReturnType<typeof commands.createInteractionFollowup>;
}

export type AutocompleteInteraction = {
    type: InteractionType.ApplicationCommandAutocomplete;
    data: AutocompleteInteractionData;
    reply: ReturnType<typeof autocomplete.createAutocompleteResponse>;
}

export type ButtonInteraction = {
    type: InteractionType.MessageComponent;
    data: ButtonInteractionData;
    // functions
}

export type ModalInteraction = {
    type: InteractionType.ModalSubmit;
    data: ModalInteractionData;
    // functions
}

export type PingInteraction = {
    type: InteractionType.Ping;
    data: PingInteractionData;
    // functions
}

export type AnyInteraction = CommandInteraction | AutocompleteInteraction | ButtonInteraction | ModalInteraction | PingInteraction;

export const createInteractionBus = () => ({
    onCommand: new TypedEvent<CommandInteraction>(),
    onAutocomplete: new TypedEvent<AutocompleteInteraction>(),
    onMessageComponent: new TypedEvent<ButtonInteraction>(),
    onModalSubmit: new TypedEvent<ModalInteraction>(),
    onPing: new TypedEvent<PingInteraction>(),
    onInteraction: new TypedEvent<AnyInteraction>()
});

export const handleInteraction = (interaction: InteractionData, interactionBus: InteractionBus) => {
    let payload: AnyInteraction;
    switch(interaction.type) {
        case InteractionType.ApplicationCommand:
            payload = {
                type: interaction.type,
                data: interaction,
                defer: commands.deferInteractionResponse(interaction),
                reply: commands.createInteractionResponse(interaction),
                edit: commands.editInteractionResponse(interaction),
                delete: commands.deleteInteractionResponse(interaction),
                followup: commands.createInteractionFollowup(interaction)
            };
            interactionBus.onCommand.emit(payload);
            break;
        case InteractionType.ApplicationCommandAutocomplete:
            payload = {
                type: interaction.type,
                data: interaction,
                reply: autocomplete.createAutocompleteResponse(interaction)
            };
            interactionBus.onAutocomplete.emit(payload);
            break;
        case InteractionType.MessageComponent:
            payload = {
                type: interaction.type,
                data: interaction
            };
            interactionBus.onMessageComponent.emit(payload);
            break;
        case InteractionType.ModalSubmit:
            payload = {
                type: interaction.type,
                data: interaction
            }
            interactionBus.onModalSubmit.emit(payload);
            break;
        case InteractionType.Ping:
            payload = {
                type: interaction.type,
                data: interaction
            }
            interactionBus.onPing.emit(payload);
            break;
        default:
            logger.warn(`Unhandled interaction type in interaction handler: ${JSON.stringify(interaction)}`);
            return;
    }
    interactionBus.onInteraction.emit(payload);
}

