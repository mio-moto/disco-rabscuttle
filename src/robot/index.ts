import { createClient } from "./clients";

export * from './alias';
export default createClient;




/* 
import { ApplicationCommandType, GatewayIntentBits, GatewayOpcodes, GatewayReceivePayload, InteractionType } from 'discord-api-types/v10';
import logger from '../logging';
import { createStateMachine } from './statemachine';
import { createGatewayHandler } from './strategies/gatewayStrategies';
import { createGatewayClient } from './sendCommands';
import { registerCommand } from './clients/rest-client';
import loadConfig, { Config } from '../config';
import { GatewayClient } from './alias';
import { createWebsocket } from './clients/websocket-client';
import { createGatewayStatemachine } from './client';



const bootstrap = async (config: Config) => {
    const { eventBus, interactionBus } = await spinup(config);


    interactionBus.onCommand.on(async (x) => {
        const commandName = x.data.data.name;
        if(commandName === 'blep') {
            const result = await x.reply({ content: "Look mom, no dependencies."} );
            logger.info(`Blep returned ${result}`)
        }


        
    })

    eventBus.onMessageCreate.on(async (message) => {
//        logger.info(`<${message.author.username}> ${message.content}`);
//        
//        logger.debug(JSON.stringify(message))
//
//        const content = await getMessage(message.channel_id, message.id, {token: config.token});
//        if(content.success) {
//            // logger.debug(JSON.stringify(message));
//            logger.debug(`<${message.author.username}> ${content.message.content}`);
//        }
        
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

*/