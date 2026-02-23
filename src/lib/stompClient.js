import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export function createStompClient(baseUrl) {
    const base = (baseUrl || '').replace(/\/$/, '')
    const client = new Client({
        webSocketFactory: () => new SockJS(`${base}/ws-blueprints`),
        reconnectDelay: 2000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: (msg) => console.log('[STOMP]', msg),
    })
    return client
}

export function subscribeBlueprint(client, author, name, onUpdate) {
    const topic = `/topic/blueprints.${author}.${name}`
    const sub = client.subscribe(topic, (msg) => {
        try {
            const body = JSON.parse(msg.body) // { author, name, points }
            onUpdate(body)
        } catch (e) {
            console.error('Mensaje STOMP inválido:', e)
        }
    })
    return () => sub.unsubscribe()
}