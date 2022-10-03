import { GatewayHeartbeat, GatewayIdentify, GatewayIntentBits, GatewayOpcodes, GatewaySendPayload } from "discord-api-types/v10";
import WebSocket from "ws";
import logger from '../logging';


type SendAction = (payload: GatewaySendPayload) => any;

// https://discord.com/developers/docs/topics/gateway#sending-heartbeats
// closure in order to support stateful sequence numbering
const createHeartbeatImpl = (send: SendAction) => {
    let sequenceNumber = 0;
    // todo: track heartbeats: https://discord.com/developers/docs/topics/gateway#heartbeat-interval-example-heartbeat-ack
    return () => {
        logger.debug(`Sending heartbeat #${sequenceNumber}`);
        const heartbeat: GatewayHeartbeat = {
            op: GatewayOpcodes.Heartbeat,
            d: sequenceNumber++
        }
        send(heartbeat);
    }
}

// https://discord.com/developers/docs/topics/gateway#identifying
const sendIdentificationImpl = (send: SendAction, token: string, intents: GatewayIntentBits[], name: string) => {
    if(intents.length <= 0) {
        throw new Error('Intents cannot be empty');
    }
    let intentNumber = 0;
    intents.forEach(intent => intentNumber &= 1 << intent)
    
    const identifyMessage: GatewayIdentify = {
        op: GatewayOpcodes.Identify,
        d: {
            token: token,
            properties: {
                os: process.platform,
                browser: name,
                device: name
            },
            intents: 1 << GatewayIntentBits.Guilds & 1 << GatewayIntentBits.GuildMessages & 1 << GatewayIntentBits.GuildWebhooks
        }
    }
    logger.debug(`Sending identify with [${intents.length}] intents, as service name '${name}'`);
    send(identifyMessage);
}

export const createGatewayClient = (websocket: WebSocket) => {
    const sendGatewayMessage = (payload: GatewaySendPayload) => websocket.send(JSON.stringify(payload));
    const sendHeartbeat = createHeartbeatImpl(sendGatewayMessage);
    const sendIdentification = (token: string, intents: GatewayIntentBits[], name: string) => sendIdentificationImpl(sendGatewayMessage, token, intents, name)

    return {
        websocket: websocket,
        sendGatewayMessage: sendGatewayMessage,
        sendHeartbeat: sendHeartbeat,
        sendIdentification: sendIdentification
    }
}

export type GatewayClient = ReturnType<typeof createGatewayClient>;