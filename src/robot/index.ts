import { ApplicationCommandType, GatewayIntentBits, GatewayOpcodes, GatewayReceivePayload, InteractionType } from 'discord-api-types/v10';
import logger from '../logging';
import { createStateMachine } from './statemachine';
import { createGatewayHandler } from './gatewayStrategies';
import { createGatewayClient, GatewayClient } from './sendCommands';
import createWebsocket from './websocket';
import { registerCommand } from './api-client';
import { createInteractionBus } from './interactionStrategies';
import loadConfig, { Config } from '../config';



const createGatewayStatemachine = (client: GatewayClient, config: Config) => {
    // @todo: does not understand or handle any form disconnect/reconnect
    const stateMachine = createStateMachine<GatewayOpcodes>(-1, {
        name: 'connection init',
        enter: () => { },
        exit: () => { }
    })

    const initialConnection = stateMachine.currentHandler;
    const postHello = {
        name: 'hello received',
        enter: () => {
            logger.info("Hello event received, identifying now.");
            client.sendIdentification(config.token, 
                [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildWebhooks],
                'rabscuttle'
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

const spinup = async (config: Config) => {
    const lastOpcodes: GatewayOpcodes[] = [];
    const [ websocketConnection, websocket ] = createWebsocket();
    const client = createGatewayClient(websocket);
    const clientHandler = createGatewayHandler(client);
    const gatewayStateMachine = createGatewayStatemachine(client, config);

    // @todo: clean this up
    websocket.removeAllListeners('message');
    websocket.on('message', (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
        const message = JSON.parse(data.toString()) as GatewayReceivePayload;
        gatewayStateMachine.transition(message.op);
        if(clientHandler.handleGatewayEvent(message)) {
            return;
        }
    });

    
    await websocketConnection;
    return clientHandler;
}

const bootstrap = async (config: Config) => {
    const { eventBus, interactionBus } = await spinup(config);

    interactionBus.onCommand.on(async (x) => {
        const commandName = x.data.data.name;
        if(commandName === 'blep') {
            const result = await x.reply({ content: "Look mom, no dependencies."} );
            logger.info(`Blep returned ${result}`)
        }


        
    })

    eventBus.onInteractionCreate.on((interaction) => {
        switch(interaction.type) {
            case InteractionType.ApplicationCommand:
                logger.info(`${interaction.member?.user.username} tries to invoke ${JSON.stringify(interaction.data)}`);
                break;
            case InteractionType.ApplicationCommandAutocomplete:
                logger.info(`${interaction.member?.user.username} requests autocomplete for ${JSON.stringify(interaction.data)}`)
                break;
            case InteractionType.MessageComponent:
                logger.info(`${interaction.member?.user.username} interacted with message component ${JSON.stringify(interaction.data)}`);
                break;
            case InteractionType.ModalSubmit:
                logger.info(`${interaction.member?.user.username} submits modal for ${JSON.stringify(interaction.data)}`);
                break;
            case InteractionType.Ping:
                logger.info(`${interaction.member?.user.username} pings ${JSON.stringify(interaction.data)}`)
                break;
            default:
                logger.warn(`no interaction handler defined for interaction type ${JSON.stringify(interaction)}`);
                break;
        }
    });

    eventBus.onReady.on(async (readyEvent) => {
        logger.info(`Ready event received, robot is called ${readyEvent.user.username}`);
        const appId = readyEvent.application.id;
        const token = config.token;

        const response = await registerCommand(appId, { token: token }, {
            name: "blep",
            type: ApplicationCommandType.ChatInput,
            description: "This is a test registration to check my typings, bazinga"
        });

        const wsp = await registerCommand(appId, { token: token }, {
            name: "bleagh",
            type: ApplicationCommandType.User,
        });

        const rsp = await registerCommand(appId, { token: token }, {
            name: "eargh",
            type: ApplicationCommandType.Message
        });
    })
}


const config = loadConfig();
bootstrap(config);

