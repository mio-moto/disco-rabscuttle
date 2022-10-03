import { GatewaySendPayload, GatewayURLQuery, GatewayVersion } from 'discord-api-types/v10';
import { ClientRequest, IncomingMessage } from 'http';
import WebSocket from 'ws';

import zlib from 'zlib'


// assumed from: https://discord.com/developers/docs/topics/gateway#connecting
export const GatewayUrl = 'gateway.discord.gg'
export const GatewayProtocol = 'wss'
export const DefaultGatewayParamters: GatewayURLQuery = {
    v: GatewayVersion,
    encoding: 'json',
    compress: undefined
}

type WebsocketMessage = {
    'type': 'Buffer',
    'data': Buffer
} | {
    'type': 'ArrayBuffer',
    'data': ArrayBuffer
} | {
    'type': 'Buffer[]',
    'data': Buffer[]
}

const VoidCallback = (type: string) => (_?: any, __?: any) => { console.log(`>>> ${type}: \n${JSON.stringify(_)} - ${JSON.stringify(__)}`) }

export const DefaultWebsocketCallbacks: WebsocketCallbacks = {
    close: () => { console.log('> Websocket closed.') },
    error: VoidCallback('error'),
    message: (data, isBinary) => {
        if(Array.isArray(data)) {
            console.error(`No Websocket Buffer[] handler`)
            return;
        }

        const payload = JSON.parse(data.toString());
        console.log(`>>> message: ${JSON.stringify(payload)}\n`);
    },
    open: () => { console.log('> Websocket opened.') },
    ping: VoidCallback('ping'),
    pong: VoidCallback('pong'),
    unexpectedResponse: VoidCallback('unexpectedResponse'),
    upgrade: (_) => { console.log('> Gateway requested websocket upgrade.') } 
}

// from: https://github.com/websockets/ws/blob/master/doc/ws.md#event-close-1
export interface WebsocketCallbacks {
    close: (code: Number, response: Buffer) => any;
    error: (error: Error) => any;
    message: (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => any;
    open: () => any;
    ping: (data: Buffer) => any;
    pong: (data: Buffer) => any;
    // redirect: (url: String, request: ClientRequest) => any;
    unexpectedResponse: (request: ClientRequest, response: IncomingMessage) => any;
    upgrade: (response: IncomingMessage) => any;

}


interface WebsocketConfig { 
    gatewayParameters: GatewayURLQuery;
    callbacks: WebsocketCallbacks
}

const generateGatewayConfig = (gatewayParameters: GatewayURLQuery) => {
    const uri = new URL(`${GatewayProtocol}://${GatewayUrl}`);
    Object.entries(gatewayParameters).forEach(([k, v]) => uri.searchParams.append(k, v))
    return uri;
}

const createWebsocket = (url: URL, websocketCallbacks: WebsocketCallbacks) => {
    const ws = new WebSocket(url, { perMessageDeflate: true });
    ws.on('open', websocketCallbacks.open);
    ws.on('message', websocketCallbacks.message);
    ws.on('ping', websocketCallbacks.ping);
    ws.on('pong', websocketCallbacks.pong);
    ws.on('upgrade', websocketCallbacks.upgrade);
    ws.on('unexpected-response', websocketCallbacks.unexpectedResponse);
    ws.on('error', websocketCallbacks.error);
    ws.on('close', websocketCallbacks.close);
    return ws;
}

const websocket = (gatewayConfig?: Partial<GatewayURLQuery>, websocketCallbacks?: Partial<WebsocketCallbacks>): [Promise<void>, WebSocket] => {
    const runtimeGatewayConfig = {...DefaultGatewayParamters, ...gatewayConfig};
    const runtimeCallbacks = {...DefaultWebsocketCallbacks, ...websocketCallbacks};
    
    const url = generateGatewayConfig(runtimeGatewayConfig);
    const ws = createWebsocket(url, runtimeCallbacks);

    const connectionPromise = new Promise<void>((resolve, reject) => {
        const state = (readyState: 0 | 1 | 2 | 3) => {
            return (['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'] as const)[readyState]
        }
        
        const timer = setInterval(() => {
            const readyState = state(ws.readyState);
            if(readyState === 'CONNECTING') {
                return;
            }
            if(readyState === 'OPEN') {
                clearInterval(timer);
                resolve();
            }

            clearInterval(timer);
            reject(`WS is either closing or already closed (state: ${readyState})`);
        }, 10);
    });

    // the websocket is behaving like XMLHttpRequest, so it needs promisfying
    return [connectionPromise, ws];
}

export const sendGatewayMessage = (websocket: WebSocket, message: GatewaySendPayload) => {
    websocket.send(JSON.stringify(message));
}

export default websocket;