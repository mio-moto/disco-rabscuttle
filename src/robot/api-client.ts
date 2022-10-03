import { RouteBases, Routes as DiscordRoutes } from 'discord-api-types/rest/v10';
import { APIApplicationCommand, APIApplicationCommandInteraction, APIApplicationCommandSubcommandGroupOption, APIInteractionResponse, APIInteractionResponseCallbackData, APIInteractionResponseChannelMessageWithSource, APIInteractionResponseDeferredChannelMessageWithSource, ApplicationCommandType, InteractionResponseType, MessageFlags, RESTPostAPIApplicationCommandsJSONBody, RESTPostAPIApplicationCommandsResult, RESTPostAPIInteractionCallbackFormDataBody, RESTPostAPIInteractionCallbackJSONBody, Snowflake } from 'discord-api-types/v10';
import fetch from 'node-fetch';
import logger from '../logging';
import { Interaction } from './interactionStrategies';


const createRoute = (endpoint: string) => `${RouteBases.api}${endpoint}`;


export const createInteractionDefer = (interaction: APIApplicationCommandInteraction) => {
    return async (flags?: MessageFlags) => {
        const uri = createRoute(DiscordRoutes.interactionCallback(interaction.id, interaction.token));
        const interactionResponse: APIInteractionResponseDeferredChannelMessageWithSource = {
            type: InteractionResponseType.DeferredChannelMessageWithSource,
            data: {
                flags: flags
            }
        };
        const response = await fetch(uri, { body: JSON.stringify(interactionResponse), headers: { 'Content-Type': 'application/json' }, method: 'POST' });
        return response.status === 204; 
    }
}

export const createInteractionResponse = (interaction: APIApplicationCommandInteraction) => {
    return async (data: APIInteractionResponseCallbackData) => {
        const url = createRoute(DiscordRoutes.interactionCallback(interaction.id, interaction.token));
        const interactionBody: APIInteractionResponseChannelMessageWithSource = {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: data
        }

        const response = await fetch(url,
            {
                body: JSON.stringify(interactionBody),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST'
            });
        return response.status === 204;
    }
}


export const registerCommand = async (applicationId: Snowflake, authorizationToken: string, definition: RESTPostAPIApplicationCommandsJSONBody) => {
    const uri = createRoute(DiscordRoutes.applicationCommands(applicationId));
    const response = await fetch(uri, { body: JSON.stringify(definition), headers: {'Authorization': `Bot ${authorizationToken}`, 'Content-Type': 'application/json'}, method: 'POST'});
    
    const json = await response.json();
    logger.debug(`registered command, reply was: ${JSON.stringify(json)}`);
    
    return json as RESTPostAPIApplicationCommandsResult; 
}