import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { prisma } from './prisma';
import { logger } from './logger';

const expo = new Expo();

export type PushPayload = Record<string, string>;

export async function sendPushToUser(
  userId: string,
  message: {
    title: string;
    body: string;
    data?: PushPayload;
    sound?: 'default' | null;
  },
): Promise<number> {
  const tokens = await prisma.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });
  if (tokens.length === 0) return 0;

  const messages: ExpoPushMessage[] = [];
  for (const { token } of tokens) {
    if (!Expo.isExpoPushToken(token)) continue;
    messages.push({
      to: token,
      title: message.title,
      body: message.body,
      sound: message.sound ?? 'default',
      data: message.data,
      channelId: 'messages',
    });
  }
  if (messages.length === 0) return 0;

  let sent = 0;
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      sent += tickets.filter((t) => t.status === 'ok').length;
      await pruneInvalidTokens(chunk, tickets);
    } catch (err) {
      logger.warn({ err, userId }, 'push send failed');
    }
  }
  return sent;
}

async function pruneInvalidTokens(messages: ExpoPushMessage[], tickets: ExpoPushTicket[]) {
  for (let i = 0; i < tickets.length; i += 1) {
    const ticket = tickets[i];
    if (ticket.status !== 'error') continue;
    if (ticket.details?.error !== 'DeviceNotRegistered') continue;
    const token = messages[i]?.to;
    if (typeof token === 'string') {
      await prisma.pushToken.deleteMany({ where: { token } }).catch(() => undefined);
    }
  }
}
