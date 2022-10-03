import { GatewayOpcodes, GatewayHello, GatewayReceivePayload, GatewayHeartbeatAck, GatewayInvalidSession, Snowflake } from "discord-api-types/v10"
import logger from '../logging';
import { createDispatchEventBus, handleDispatch } from "./dispatchStrategies";
import { createInteractionBus, handleInteraction } from "./interactionStrategies";
import { GatewayClient } from "./sendCommands";


function isNumber(value: any | null | undefined): value is Number {
    return typeof value === 'number';
}
  

// @todo: dumb script
const GatewayOpNumbers = Object.values(GatewayOpcodes).filter(x => isNumber(x)) as Number[];
const isGatewaySendPayload = (opCode: Number) => {
    return GatewayOpNumbers.includes(opCode);
}

const handleHello = (client: GatewayClient, message: GatewayHello) => {
    const heartbeatInterval = message.d.heartbeat_interval;
    logger.debug(`Gateway heartbeat interval ${heartbeatInterval}`)
    setTimeout(() => {
        client.sendHeartbeat();
        setInterval(client.sendHeartbeat, heartbeatInterval - 5_000);
    }, Math.random() * 100)
}

const handleHeartbeatAck = (client: GatewayClient, message: GatewayHeartbeatAck) => {
    // todo: track heartbeats: https://discord.com/developers/docs/topics/gateway#heartbeat-interval-example-heartbeat-ack
}

const handleInvalidSession = (client: GatewayClient, message: GatewayInvalidSession) => {
    logger.error(`Closing websocket, this is an invalid session: resumable: ${message.d}`);
    client.websocket.close();
}

// @todo: using the type-defs spazzes out vscode (but not the compiler?)
// actual name: GatewayMessageReactionRemoveAllDispatchData
interface GatewayMessageReactionRemoveAllDispatchData {
    /**
     * The id of the channel
     */
    channel_id: Snowflake;
    /**
     * The id of the message
     */
    message_id: Snowflake;
    /**
     * The id of the guild
     */
    guild_id?: Snowflake;
}

export const createGatewayHandler = (client: GatewayClient) => {
    const eventBus = createDispatchEventBus();
    const interactionBus = createInteractionBus();
    eventBus.onInteractionCreate.on(x => handleInteraction(x, interactionBus));
    
    const handleGatewayEvent = (data?: GatewayReceivePayload): boolean => {
        if(!data || !isGatewaySendPayload(data.op)) {
            return false;
        }
    
        switch(data.op) {
            case GatewayOpcodes.Hello:
                handleHello(client, data);
                break;
            case GatewayOpcodes.HeartbeatAck:
                handleHeartbeatAck(client, data);
                break;
            case GatewayOpcodes.InvalidSession:
                handleInvalidSession(client, data);
                break;
            case GatewayOpcodes.Dispatch:
                handleDispatch(eventBus, data);
                break;
            default: logger.warn(`unhandled gateway error: ${JSON.stringify(data.op)}`)

        }
    
        return true;
    }

    return {
        handleGatewayEvent: handleGatewayEvent,
        eventBus: eventBus,
        interactionBus: interactionBus,
    }
}

export type GatewayHandler = ReturnType<typeof createGatewayHandler>;