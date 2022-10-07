import { GatewayOpcodes, GatewayHello, GatewayReceivePayload, GatewayHeartbeatAck, GatewayInvalidSession } from "discord-api-types/v10"
import logger from "../../logging";
import { GatewayClient } from "../alias";
import { createDispatchEventBus, handleDispatch } from "./dispatch-strategies";
import { createInteractionBus, handleInteraction } from "./interaction-strategies";


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

