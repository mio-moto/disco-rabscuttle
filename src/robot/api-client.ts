import { RouteBases, Routes as DiscordRoutes } from 'discord-api-types/rest/v10';
import { APIApplicationCommand, APIApplicationCommandAutocompleteResponse, APIApplicationCommandInteraction, APIApplicationCommandOptionChoice, APIApplicationCommandSubcommandGroupOption, APICommandAutocompleteInteractionResponseCallbackData, APIInteractionResponse, APIInteractionResponseCallbackData, APIInteractionResponseChannelMessageWithSource, APIInteractionResponseDeferredChannelMessageWithSource, APIInteractionResponseDeferredMessageUpdate, APIInteractionResponsePong, APIInteractionResponseUpdateMessage, APIModalInteractionResponse, APIModalInteractionResponseCallbackData, ApplicationCommandType, InteractionResponseType, InteractionType, MessageFlags, RESTError, RESTGetAPIWebhookWithTokenMessageResult, RESTPatchAPIInteractionFollowupResult, RESTPatchAPIInteractionOriginalResponseJSONBody, RESTPatchAPIWebhookWithTokenResult, RESTPostAPIApplicationCommandsJSONBody, RESTPostAPIApplicationCommandsResult, RESTPostAPIInteractionCallbackFormDataBody, RESTPostAPIInteractionCallbackJSONBody, RESTPostAPIInteractionFollowupResult, RESTPostAPIWebhookWithTokenJSONBody, RESTPostAPIWebhookWithTokenResult, RESTPostAPIWebhookWithTokenWaitResult, Snowflake } from 'discord-api-types/v10';
import fetch, { RequestInit, Response } from 'node-fetch';
import logger from '../logging';


const createRoute = (endpoint: string) => `${RouteBases.api}${endpoint}`;

type EmptyResponse = RESTRequest & (SuccessfulEmptyResponse | FailureResponse);
type PayloadResponse<T> = RESTRequest & (SuccessfulBodyResponse<T> | FailureResponse);  


type RESTRequest = {
    response: Response;
}

type SuccessfulEmptyResponse = {
    success: true;
}

type FailureResponse = {
    success: false;
    error: RESTError;
}

type SuccessfulBodyResponse<T> = {
    success: true;
    message: T;
}


const emptyResponse = async (response: Response, ...expectedStatus: number[]): Promise<EmptyResponse> => {
    if(expectedStatus.includes(response.status)) {
        return {
            response: response,
            success: true
        }
    }

    return {
        response: response,
        success: false,
        error: (await response.json()) as RESTError
    }
}

const bodyResponse = async <T>(response: Response, ...expectedStatus: number[]): Promise<PayloadResponse<T>> => {
    if(expectedStatus.includes(response.status)) {
        return {
            response: response,
            success: true,
            message: (await response.json()) as T
        }
    }

    return {
        response: response,
        success: false,
        error: (await response.json()) as RESTError
    }
}

const bodylessHTTPMethods = ['GET', 'HEAD', 'DELETE'] as const;
const bodiedHTTPMethods = ['POST', 'PUT', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH'] as const;
const httpMethods = [...bodylessHTTPMethods, ...bodiedHTTPMethods] as const;
type BodylessHTTPMethods = typeof bodylessHTTPMethods[number];
type BodiedHTTPMethods = typeof bodiedHTTPMethods[number];
type HTTPMethods = typeof httpMethods[number];
type Authorization = {
    bearer: string
} | {
    token: string
};

type RequestHeaders =  {[k: string]: string};



const [ createBodylessRequest, createBodiedRequest ] = (() => {
    // hiding the helpers from the namespace for now
    const buildParams = (method: HTTPMethods, body?: any, authorization?: Authorization, optionalHeaders?:RequestHeaders) : RequestInit => {
        const authorizationFragment = !authorization ? undefined : 
            { Authorization: ('bearer' in authorization) ? `Bearer ${authorization.bearer}` : `Bot ${authorization.token}` };
        return {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...optionalHeaders,
                ...authorizationFragment
            },
            body: JSON.stringify(body)
        }
    }
    const buildBodylessParams = (method: BodylessHTTPMethods, authorization?: Authorization, optionalHeaders?:RequestHeaders): RequestInit => buildParams(method, undefined, authorization, optionalHeaders);
    const buildBodiedParams = (method: BodiedHTTPMethods, body: any, authorization?: Authorization, optionalHeaders?:RequestHeaders) : RequestInit => buildParams(method, body, authorization, optionalHeaders);
    
    const createBodylessRequest = (url: string, method: BodylessHTTPMethods, authorization?: Authorization, optionalHeaders?: RequestHeaders) => {
        return fetch(url, buildBodylessParams(method, authorization, optionalHeaders))
    }
    const createBodiedRequest = (url: string, method: BodiedHTTPMethods, body: any, authorization?: Authorization, optionalHeaders?: RequestHeaders) => {
        return fetch(url, buildBodiedParams(method, body, authorization, optionalHeaders));
    }

    return [createBodylessRequest, createBodiedRequest] as const;
})()



const deferInteraction = (interaction: APIApplicationCommandInteraction) => {
    return async (flags?: MessageFlags) => {
        const url = createRoute(DiscordRoutes.interactionCallback(interaction.id, interaction.token));
        const interactionResponse: APIInteractionResponseDeferredChannelMessageWithSource = {
            type: InteractionResponseType.DeferredChannelMessageWithSource,
            data: {
                flags: flags
            }
        };
        const response = await createBodiedRequest(url, 'POST', interactionResponse);
        return await emptyResponse(response, 204);
    }
}



type DataTypes = undefined | APICommandAutocompleteInteractionResponseCallbackData | APIModalInteractionResponseCallbackData |
    APIInteractionResponseCallbackData | Pick<APIInteractionResponseCallbackData, 'flags'> | APIInteractionResponseCallbackData;
type ConditionalDataType<T extends InteractionResponseType> =
    T extends InteractionResponseType.Pong ? undefined :
    T extends InteractionResponseType.DeferredMessageUpdate ? undefined :
    T extends InteractionResponseType.ApplicationCommandAutocompleteResult ? APICommandAutocompleteInteractionResponseCallbackData : 
    T extends InteractionResponseType.ChannelMessageWithSource ? APIInteractionResponseCallbackData : 
    T extends InteractionResponseType.DeferredChannelMessageWithSource ? APIInteractionResponseCallbackData : 
    T extends InteractionResponseType.Modal ? APIModalInteractionResponseCallbackData : 
    T extends InteractionResponseType.UpdateMessage ? APIInteractionResponseCallbackData : undefined ;
type InteractionResponse = {
    type: InteractionResponseType,
    data: DataTypes
};
function buildResponse<V extends InteractionResponseType>(type: V, data: ConditionalDataType<V>): InteractionResponse {
    return ({
        type: type,
        data: data
    })
}

const interactionResponseT = <V extends InteractionResponseType>(interaction: APIApplicationCommandInteraction, type: V) => {
    return async (data: ConditionalDataType<V>) => {
        const url = createRoute(DiscordRoutes.interactionCallback(interaction.id, interaction.token));
        const interactionBody = buildResponse(type, data)
        const response = await createBodiedRequest(url, 'POST', interactionBody);
        return await emptyResponse(response, 204);
    }
}

const pingResponse = (interaction: APIApplicationCommandInteraction) => interactionResponseT<InteractionResponseType.Pong>(interaction, InteractionResponseType.Pong);
const messageResponse = (interaction: APIApplicationCommandInteraction) => interactionResponseT<InteractionResponseType.ChannelMessageWithSource>(interaction, InteractionResponseType.ChannelMessageWithSource);
const deferMessage = (interaction: APIApplicationCommandInteraction) => interactionResponseT<InteractionResponseType.DeferredChannelMessageWithSource>(interaction, InteractionResponseType.DeferredChannelMessageWithSource);
const updateDefferedMessage = (interaction: APIApplicationCommandInteraction) => interactionResponseT<InteractionResponseType.DeferredMessageUpdate>(interaction, InteractionResponseType.DeferredMessageUpdate);
const updateResponse = (interaction: APIApplicationCommandInteraction) => interactionResponseT<InteractionResponseType.UpdateMessage>(interaction, InteractionResponseType.UpdateMessage);
const autocompleteResponse = (interaction: APIApplicationCommandInteraction) => interactionResponseT<InteractionResponseType.ApplicationCommandAutocompleteResult>(interaction, InteractionResponseType.ApplicationCommandAutocompleteResult);
const modalResponse = (interaction: APIApplicationCommandInteraction) => interactionResponseT<InteractionResponseType.Modal>(interaction, InteractionResponseType.Modal);


const createFollowup = (interaction: APIApplicationCommandInteraction) => {
    return async (data: RESTPostAPIWebhookWithTokenJSONBody) => {
        const url = createRoute(DiscordRoutes.webhookMessage(interaction.id, interaction.token));
        const interactionBody: APIInteractionResponseChannelMessageWithSource = {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: data
        };
        const response = await createBodiedRequest(url, "POST", interactionBody)
        return await bodyResponse<RESTPostAPIWebhookWithTokenResult>(response, 204);
    }
}


const interactionDetails = (interaction: APIApplicationCommandInteraction, messageId: Snowflake) => {
    return async () => {
        const url = createRoute(DiscordRoutes.webhookMessage(interaction.id, interaction.token, messageId));
        const response = await createBodylessRequest(url, 'GET');
        return await bodyResponse<RESTGetAPIWebhookWithTokenMessageResult>(response, 201);
    }
}

const editInteraction = <T>(interaction: APIApplicationCommandInteraction, messageId: Snowflake) => {
    return async (data: RESTPostAPIWebhookWithTokenJSONBody) => {
        const url = createRoute(DiscordRoutes.webhookMessage(interaction.id, interaction.token, messageId));
        const interactionBody: APIInteractionResponseChannelMessageWithSource = {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: data
        };
        const response = await createBodiedRequest(url, "PATCH", interactionBody)
        return await bodyResponse<T>(response, 204);
    }
}

const deleteInteraction = (interaction: APIApplicationCommandInteraction, messageId: Snowflake) => {
    return async () => {
        const url = createRoute(DiscordRoutes.webhookMessage(interaction.id, interaction.token, messageId));
        const response = await createBodylessRequest(url, 'DELETE');
        return await emptyResponse(response, 204);
    }
}




export const clientFactories = {
    interactions: {
        deferInteractionResponse: deferInteraction,
        createInteractionResponse: messageResponse,
        editInteractionResponse: (interaction: APIApplicationCommandInteraction) => editInteraction<RESTPatchAPIInteractionOriginalResponseJSONBody>(interaction, '@original'),
        deleteInteractionResponse: (interaction: APIApplicationCommandInteraction) => deleteInteraction(interaction, '@original'),

        createInteractionFollowup: createFollowup,
        editInteractionFollowup: (interaction: APIApplicationCommandInteraction, messageId: Snowflake) => editInteraction<RESTPatchAPIInteractionFollowupResult>(interaction, messageId),
        deleteInteractionFollowup: (interaction: APIApplicationCommandInteraction, messageId: Snowflake) => deleteInteraction(interaction, messageId)
    }
}


export const registerCommand = async (applicationId: Snowflake, authorization: Authorization, definition: RESTPostAPIApplicationCommandsJSONBody) => {
    const url = createRoute(DiscordRoutes.applicationCommands(applicationId));
    const response = await createBodiedRequest(url, 'POST', definition, authorization);
    const result = await bodyResponse<RESTPostAPIApplicationCommandsResult>(response, 200);
    if(result.success) {
        // this debug log doesn't belong here, I think
        logger.debug(`registered command, reply was: ${JSON.stringify(result.message)}`);
    } else {
        logger.debug(`registration failed, error code [${result.response.status}] reply was: ${JSON.stringify(result.error)}`)
    }
    return result;
}