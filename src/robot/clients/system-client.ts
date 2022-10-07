import { GatewayOpcodes, GatewayIntentBits, GatewayReceivePayload, Snowflake, RESTPostAPIApplicationCommandsJSONBody } from "discord-api-types/v10";
import logger from "../../logging";
import { GatewayClient, GatewayHandler } from "../alias";
import { createGatewayClient } from "./gateway-client";
import { createStateMachine } from "../systems/statemachine";
import { createGatewayHandler } from "../strategies/gateway-strategies";
import { BotAuthorization, createRestClient } from "./rest-client";
import { createWebsocket } from "./websocket-client";


const DefaultGatewayIntents = [
    GatewayIntentBits.MessageContent,
    // GatewayIntentBits.GuildPresences,
    // GatewayIntentBits.GuildMembers
] as const;

const createGatewayStatemachine = (client: GatewayClient, clientParams: ClientParameters) => {
    // @todo: does not understand or handle any form disconnect/reconnect
    const stateMachine = createStateMachine<GatewayOpcodes>(-1, {
        name: 'connection init',
        enter: () => { },
        exit: () => { }
    })

    const initialConnection = stateMachine.currentHandler;
    const intents = [...(new Set<number>([...DefaultGatewayIntents, ...(clientParams.intents ?? [])]))];


    const postHello = {
        name: 'hello received',
        enter: () => {
            logger.info("Hello event received, identifying now.");
            client.sendIdentification(
                clientParams.authorization.token, 
                intents,
                clientParams.identifier ?? 'rabscuttle'
            );
        },
        exit: () => { }
    };

    const postIdent = {
        name: 'identified & ready',
        enter: () => {
            logger.info('Identification received, registering test command');

        },
        exit: () => { }
    };

    stateMachine.register(initialConnection, postHello, GatewayOpcodes.Hello);
    stateMachine.register(postHello, postIdent, GatewayOpcodes.Dispatch);
    return stateMachine;
}

const attachGatewayBus = (gatewayClient: GatewayClient, clientHandler: GatewayHandler, clientParams: ClientParameters) => {
    const gatewayStateMachine = createGatewayStatemachine(gatewayClient, clientParams);

    gatewayClient.websocket.on('message', (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
        const message = JSON.parse(data.toString()) as GatewayReceivePayload;
        gatewayStateMachine.transition(message.op);
        if(clientHandler.handleGatewayEvent(message)) {
            return;
        }
    })
}


interface ClientParameters {
    authorization: BotAuthorization,
    intents?: GatewayIntentBits[],
    identifier?: string
}


export const createClient = (configuration: ClientParameters) => {
    const [ websocketConnection, websocket ] = createWebsocket();

    const gatewayClient = createGatewayClient(websocket);
    const clientHandler = createGatewayHandler(gatewayClient);
    const restClient = createRestClient(configuration.authorization);
    attachGatewayBus(gatewayClient, clientHandler, configuration);

    let appId: Snowflake = "";

    clientHandler.eventBus.onReady.on(x => {
        appId = x.application.id;
    })

    return [websocketConnection, {
        gateway: gatewayClient,
        clientHandler: clientHandler,
        restClient: {
            ...restClient,
            registerCommand: (definition: RESTPostAPIApplicationCommandsJSONBody) => restClient.registerCommand(appId, definition)
        }
    }] as const;

}
