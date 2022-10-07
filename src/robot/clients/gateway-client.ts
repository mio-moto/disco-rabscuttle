import { GatewayHeartbeat, GatewayIdentify, GatewayIntentBits, GatewayOpcodes, GatewaySendPayload, GatewayUpdatePresence } from "discord-api-types/v10";
import { send } from "process";
import WebSocket from "ws";
import logger from '../../logging';
import { Presence } from "../alias";


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
    intents.forEach(intent => intentNumber |= intent)
    logger.debug(`Intent: ${intentNumber}`)
    const identifyMessage: GatewayIdentify = {
        op: GatewayOpcodes.Identify,
        d: {
            token: token,
            properties: {
                os: process.platform,
                browser: name,
                device: name
            },
            intents: intentNumber
        }
    }
    logger.debug(`Sending identify with [${intents.length}] intents, as service name '${name}'`);
    send(identifyMessage);
}

const sendUpdatePresence = (send: SendAction, presence: Presence) => {
    const data: GatewayUpdatePresence = {
        op: GatewayOpcodes.PresenceUpdate,
        d: presence
    };
    send(data);
}

export const createGatewayClient = (websocket: WebSocket) => {
    const sendGatewayMessage = (payload: GatewaySendPayload) => websocket.send(JSON.stringify(payload));
    const sendHeartbeat = createHeartbeatImpl(sendGatewayMessage);
    const sendIdentification = (token: string, intents: GatewayIntentBits[], name: string) => sendIdentificationImpl(sendGatewayMessage, token, intents, name)
    const updatePresence = (presence: Presence) => sendUpdatePresence(sendGatewayMessage, presence);

    return {
        websocket: websocket,
        sendGatewayMessage: sendGatewayMessage,
        sendHeartbeat: sendHeartbeat,
        sendIdentification: sendIdentification,
        updatePresence: updatePresence
    }
}

