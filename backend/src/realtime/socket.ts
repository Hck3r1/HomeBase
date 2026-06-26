import { Server as IOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

let io: IOServer | null = null;

export function getIo(): IOServer | null {
  return io;
}

export function setIo(instance: IOServer | null) {
  io = instance;
}

export function room(conversationId: string) {
  return `conv:${conversationId}`;
}

export function createSocketServer(httpServer: HttpServer): IOServer {
  const server = new IOServer(httpServer, { cors: { origin: true, credentials: true } });

  server.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Missing token'));
    try {
      const claims = verifyAccessToken(token);
      socket.data.userId = claims.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  server.on('connection', async (socket) => {
    const userId = socket.data.userId as string;

    try {
      const parts = await prisma.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true },
      });
      for (const p of parts) socket.join(room(p.conversationId));
    } catch {
      /* non-fatal */
    }

    socket.on('conversation:join', (conversationId: string, ack?: (r: { ok: boolean }) => void) => {
      void prisma.conversationParticipant
        .findFirst({ where: { conversationId, userId } })
        .then((part) => {
          if (part) socket.join(room(conversationId));
          ack?.({ ok: !!part });
        })
        .catch(() => ack?.({ ok: false }));
    });

    socket.on('typing', ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) => {
      socket.to(room(conversationId)).emit('typing', { conversationId, userId, isTyping });
    });

    socket.on('chat:focus', (conversationId: string) => {
      socket.data.activeConversationId = conversationId;
    });

    socket.on('chat:blur', () => {
      socket.data.activeConversationId = null;
    });

    socket.on('message:read', async ({ conversationId }: { conversationId: string }) => {
      await prisma.message.updateMany({
        where: { conversationId, senderId: { not: userId }, readAt: null },
        data: { readAt: new Date() },
      });
      socket.to(room(conversationId)).emit('message:read', { conversationId, userId });
    });
  });

  setIo(server);
  return server;
}
