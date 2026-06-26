import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { RatingSummary } from './reviews';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  listerType: 'agent' | 'landlord' | null;
  phone: string | null;
  kycStatus: string;
  kycVerified: boolean;
  kycVerifiedAt: string | null;
  rating: RatingSummary;
}

export interface ConversationListing {
  id: string;
  title: string;
  listingType: string;
  status: string;
  description: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  address: string;
  city: string;
  state: string;
  photos: { id: string; url: string }[];
  rentDetails: { annualRent?: number; monthlyRent?: number } | null;
  saleDetails: { salePrice: number } | null;
  shortstayDetails: { nightlyRate: number } | null;
  owner: UserProfile;
  rating: RatingSummary;
}

export interface ConversationParticipant {
  userId: string;
  user: UserProfile;
}

export interface Conversation {
  id: string;
  listingId: string;
  participants: ConversationParticipant[];
  listing: ConversationListing;
  counterparty: UserProfile | null;
  messages: Message[];
  unreadCount?: number;
  updatedAt: string;
}

export const conversationsKey = ['conversations'] as const;
export const conversationKey = (id: string) => ['conversation', id] as const;
export const messagesKey = (id: string) => ['messages', id] as const;

export function useConversations() {
  return useQuery({
    queryKey: conversationsKey,
    queryFn: async () => (await api.get<Conversation[]>('/conversations')).data,
  });
}

export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: conversationKey(conversationId),
    queryFn: async () => (await api.get<Conversation>(`/conversations/${conversationId}`)).data,
    enabled: Boolean(conversationId),
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: messagesKey(conversationId),
    queryFn: async () => (await api.get<Message[]>(`/conversations/${conversationId}/messages`)).data,
    enabled: Boolean(conversationId),
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  return useMutation({
    mutationFn: async (body: string) =>
      (await api.post<Message>(`/conversations/${conversationId}/messages`, { body })).data,
    onMutate: async (body: string) => {
      await qc.cancelQueries({ queryKey: messagesKey(conversationId) });
      const previous = qc.getQueryData<Message[]>(messagesKey(conversationId)) ?? [];
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        conversationId,
        senderId: userId,
        body,
        readAt: null,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<Message[]>(messagesKey(conversationId), [...previous, optimistic]);
      return { previous };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.previous) qc.setQueryData(messagesKey(conversationId), ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
      void qc.invalidateQueries({ queryKey: conversationsKey });
      void qc.invalidateQueries({ queryKey: conversationKey(conversationId) });
    },
  });
}

export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) =>
      (await api.post<Conversation>('/conversations', { listingId })).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: conversationsKey });
    },
  });
}
