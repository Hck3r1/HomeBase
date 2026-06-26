import { io, Socket } from 'socket.io-client';
import { api } from './api';

let socket: Socket | null = null;

type MessageNewHandler = (message: unknown) => void;
type TypingHandler = (payload: { userId: string; isTyping: boolean }) => void;
type MessageReadHandler = (payload: unknown) => void;

const messageNewHandlers = new Set<MessageNewHandler>();
const typingHandlers = new Set<TypingHandler>();
const messageReadHandlers = new Set<MessageReadHandler>();

function socketUrl(): string {
  const base = api.defaults.baseURL ?? 'http://localhost:4000/api/v1';
  return base.replace(/\/api\/v1\/?$/, '');
}

function attachBridgeListeners(sock: Socket) {
  if ((sock as Socket & { __bridgeAttached?: boolean }).__bridgeAttached) return;
  (sock as Socket & { __bridgeAttached?: boolean }).__bridgeAttached = true;

  sock.on('message:new', (payload) => {
    messageNewHandlers.forEach((handler) => handler(payload));
  });
  sock.on('typing', (payload) => {
    typingHandlers.forEach((handler) => handler(payload));
  });
  sock.on('message:read', (payload) => {
    messageReadHandlers.forEach((handler) => handler(payload));
  });
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(socketUrl(), {
    auth: { token },
    transports: ['polling', 'websocket'],
    autoConnect: false,
  });
  attachBridgeListeners(socket);
  return socket;
}

export function ensureSocketConnected(): void {
  if (socket && !socket.connected) socket.connect();
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function subscribeMessageNew(handler: MessageNewHandler): () => void {
  messageNewHandlers.add(handler);
  return () => messageNewHandlers.delete(handler);
}

export function subscribeTyping(handler: TypingHandler): () => void {
  typingHandlers.add(handler);
  return () => typingHandlers.delete(handler);
}

export function subscribeMessageRead(handler: MessageReadHandler): () => void {
  messageReadHandlers.add(handler);
  return () => messageReadHandlers.delete(handler);
}
