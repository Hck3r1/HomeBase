import { prisma } from '../../lib/prisma';
import { sendPushToUser } from '../../lib/push';
import { getIo } from '../../realtime/socket';

export async function isUserViewingConversation(userId: string, conversationId: string): Promise<boolean> {
  const io = getIo();
  if (!io) return false;
  const sockets = await io.fetchSockets();
  return sockets.some(
    (socket) => socket.data.userId === userId && socket.data.activeConversationId === conversationId,
  );
}

export async function notifyNewMessage(message: {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
}) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: message.conversationId },
    select: {
      listing: { select: { title: true } },
      participants: {
        where: { userId: { not: message.senderId } },
        select: { userId: true },
      },
    },
  });
  if (!conversation) return;

  const sender = await prisma.user.findUnique({
    where: { id: message.senderId },
    select: { name: true },
  });
  if (!sender) return;

  const preview = message.body.length > 120 ? `${message.body.slice(0, 117)}...` : message.body;
  const listingTitle = conversation.listing.title;

  await Promise.all(
    conversation.participants.map(async (participant) => {
      if (await isUserViewingConversation(participant.userId, message.conversationId)) return;
      await sendPushToUser(participant.userId, {
        title: sender.name,
        body: preview,
        data: {
          type: 'message_new',
          conversationId: message.conversationId,
          listingTitle,
        },
      });
    }),
  );
}
